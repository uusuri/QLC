#include "sandbox/sandbox.hpp"

#include <array>
#include <cerrno>
#include <csignal>
#include <chrono>
#include <expected>
#include <optional>
#include <type_traits>
#include <span>
#include <string>
#include <utility>
#include <variant>
#include <vector>

#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>
#include <fcntl.h>

namespace sandbox
{
    namespace
    {
        [[nodiscard]]
        SystemError make_system_error(
            Operation operation,
            int error_number)
        {
            std::error_code code{error_number, std::generic_category()};
            SystemError system_error{operation, code};
            return system_error;
        }

        [[nodiscard]]
        std::vector<std::string> make_argument_storage(
            const Command &command)
        {
            std::vector<std::string> storage;
            storage.reserve(command.arguments.size() + 1);
            storage.push_back(command.executable.string());
            storage.insert(
                storage.end(),
                command.arguments.begin(),
                command.arguments.end());
            return storage;
        }

        [[nodiscard]]
        std::vector<char *> make_pointer_array(
            std::vector<std::string> &storage)
        {
            std::vector<char *> pointer_array;
            pointer_array.reserve(storage.size() + 1);
            for (std::string &str : storage)
            {
                pointer_array.push_back(str.data());
            }
            pointer_array.push_back(nullptr);
            return pointer_array;
        }

        [[nodiscard]]
        std::expected<pid_t, SystemError> fork_process()
        {
            pid_t result = ::fork();
            if (result == -1)
            {
                const int saved_errno = errno;
                return std::unexpected(
                    make_system_error(
                        Operation::Fork,
                        saved_errno));
            }

            return result;
        }

        [[nodiscard]]
        std::expected<ChildStatus, SystemError> wait_for_child(
            pid_t child_pid)
        {
            int status = 0;
            while (true)
            {
                pid_t result = ::waitpid(child_pid, &status, 0);

                if (result == -1)
                {
                    const int saved_errno = errno;
                    if (saved_errno == EINTR)
                    {
                        continue;
                    }
                    return std::unexpected(
                        make_system_error(
                            Operation::Waitpid,
                            saved_errno));
                }
                else
                {
                    break;
                }
            }
            if (WIFEXITED(status))
            {
                int code = WEXITSTATUS(status);
                return ChildStatus{Exited{code}};
            }
            {
                int code = WTERMSIG(status);
                return ChildStatus{Signaled{code}};
            }
            return std::unexpected(SystemError{
                Operation::Waitpid,
                std::make_error_code(std::errc::state_not_recoverable)});
        }

        [[nodiscard]]
        std::expected<void, SystemError> validate_limits(
            const ResourceLimits &limits)
        {
            if (limits.cpu_time.has_value())
            {
                const auto seconds = limits.cpu_time->count();
                if (seconds <= 0)
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EINVAL));
                }
                if (!std::in_range<rlim_t>(seconds))
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EOVERFLOW));
                }

                const rlim_t soft = static_cast<rlim_t>(seconds);

                if (soft >= RLIM_INFINITY - 1)
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EOVERFLOW));
                }
            }
            if (limits.wall_time.has_value())
            {
                if (limits.wall_time->count() <= 0)
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EINVAL));
                }
            }
            if (limits.address_space_bytes.has_value())
            {
                const auto address_space_value = *limits.address_space_bytes;
                if (address_space_value == 0)
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EINVAL));
                }
                if (!std::in_range<rlim_t>(address_space_value))
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EOVERFLOW));
                }

                const rlim_t converted = static_cast<rlim_t>(address_space_value);

                if (converted == RLIM_INFINITY)
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EOVERFLOW));
                }
            }
            if (limits.file_size_bytes.has_value())
            {
                const auto file_size_value = *limits.file_size_bytes;
                if (file_size_value == 0)
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EINVAL));
                }
                if (!std::in_range<rlim_t>(file_size_value))
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EOVERFLOW));
                }

                const rlim_t converted = static_cast<rlim_t>(file_size_value);

                if (converted == RLIM_INFINITY)
                {
                    return std::unexpected(
                        make_system_error(
                            Operation::ValidateLimits,
                            EOVERFLOW));
                }
            }

            return {};
        }

        [[nodiscard]]
        auto apply_cpu_limit(std::chrono::seconds limit)
            -> std::expected<void, SystemError> {
            
            rlim_t soft_lim = static_cast<rlim_t>(limit.count());
            rlimit rlim{
                soft_lim,
                soft_lim + 1
            };
            auto result = ::setrlimit(RLIMIT_CPU, &rlim);
            if (result == -1) {
                const int saved_errno = errno;
                return std::unexpected(make_system_error(
                    Operation::SetCpuLimit,
                    saved_errno
                ));
            }
            return {};
        }

        [[nodiscard]]
        auto apply_address_space_limit(std::uint64_t bytes)
            -> std::expected<void, SystemError> {
            
            rlim_t soft_lim = static_cast<rlim_t>(bytes);
            rlimit r_lim{
                soft_lim,
                soft_lim
            };
            auto result = ::setrlimit(RLIMIT_AS, &r_lim);
            if (result == -1) {
                const int saved_errno = errno;
                return std::unexpected(make_system_error(
                    Operation::SetAddressSpaceLimit,
                    saved_errno
                ));
            }
            return {};
        }

        class UniqueFd
        {
        public:
            UniqueFd() noexcept = default;
            explicit UniqueFd(int fd) noexcept
                : fd_{fd}
            {
            }

            ~UniqueFd() noexcept
            {
                reset();
            }

            UniqueFd(const UniqueFd &) = delete;

            UniqueFd &operator=(const UniqueFd &) = delete;

            UniqueFd(UniqueFd &&other) noexcept
                : fd_{std::exchange(other.fd_, -1)}
            {
            }

            UniqueFd &operator=(UniqueFd &&other) noexcept
            {
                if (this != &other)
                {
                    reset(std::exchange(other.fd_, -1));
                }
                return *this;
            }

            [[nodiscard]]
            int get() const noexcept
            {
                return fd_;
            }

            [[nodiscard]]
            explicit operator bool() const noexcept
            {
                return fd_ >= 0;
            }
            void reset(int new_fd = -1) noexcept
            {
                if (fd_ >= 0 && fd_ != new_fd)
                {
                    static_cast<void>(::close(fd_));
                }
                fd_ = new_fd;
            }

        private:
            int fd_{-1};
        };

        struct Pipe
        {
            UniqueFd read_end;
            UniqueFd write_end;
        };

        struct ChildErrorPacket
        {
            Operation operation;
            int error_number;
        };

        static_assert(std::is_trivially_copyable_v<ChildErrorPacket>);

        [[nodiscard]]
        auto set_close_on_exec(int fd)
            -> std::expected<void, SystemError>
        {
            const int flags = ::fcntl(fd, F_GETFD);
            if (flags == -1)
            {
                const auto error = errno;
                return std::unexpected(make_system_error(
                    Operation::GetDescriptorFlags,
                    error));
            }
            const int new_flags = flags | FD_CLOEXEC;
            const auto result = ::fcntl(fd, F_SETFD, new_flags);
            if (result == -1)
            {
                const auto error = errno;
                return std::unexpected(make_system_error(
                    Operation::SetDescriptorFlags,
                    error));
            }
            return {};
        }

        [[nodiscard]]
        auto create_cloexec_pipe()
            -> std::expected<Pipe, SystemError>
        {
            std::array<int, 2> descriptors{-1, -1};
            const auto result_create = ::pipe(descriptors.data());
            if (result_create == -1)
            {
                const auto error = errno;
                return std::unexpected(make_system_error(
                    Operation::CreatePipe,
                    error));
            }
            Pipe pipe{
                UniqueFd{descriptors[0]},
                UniqueFd{descriptors[1]},
            };
            const auto result_read_end = set_close_on_exec(pipe.read_end.get());
            if (!result_read_end)
            {
                return std::unexpected(result_read_end.error());
            }
            const auto result_write_end = set_close_on_exec(pipe.write_end.get());
            if (!result_write_end)
            {
                return std::unexpected(result_write_end.error());
            }
            return pipe;
        }

        [[nodiscard]]
        auto write_child_error_packet(
            int fd,
            const ChildErrorPacket &packet
        ) noexcept 
            -> std::expected<void, int> {
            const auto packet_view =
                std::span{&packet, std::size_t{1}};
            const auto bytes = std::as_bytes(packet_view);
            std::size_t offset = 0;
            while (offset < bytes.size()) {
                const auto written = ::write(
                    fd,
                    bytes.data() + offset,
                    bytes.size() - offset
                );
                if (written > 0) {
                    offset += static_cast<std::size_t>(written);
                    continue;
                }
                if (written == -1) {
                    const int error = errno;
                    if (error == EINTR) {
                        continue;
                    }
                    return std::unexpected(error);
                }
                if (written == 0) {
                    return std::unexpected(EIO);
                }
            }
            return {};
        }
        
        [[nodiscard]]
        auto read_child_error_packet(int fd)
            -> std::expected<std::optional<ChildErrorPacket>, SystemError> {
                
            ChildErrorPacket child_packet{};
            auto child_packet_view = std::span{&child_packet, std::size_t{1}};
            auto writable_bytes = std::as_writable_bytes(child_packet_view);
            std::size_t offset = 0;
            while (offset < writable_bytes.size()) {
                const auto readen = ::read(
                    fd,
                    writable_bytes.data() + offset,
                    writable_bytes.size() - offset
                );
                if (readen > 0) {
                    offset += static_cast<std::size_t>(readen);
                    continue;
                }
                if (readen == -1) {
                    const int error = errno;
                    if (error == EINTR) {
                        continue;
                    }
                    return std::unexpected(make_system_error(
                            Operation::ReadChildError,
                            error
                    ));
                }
                if (readen == 0) {
                    if (offset == 0) {
                        return std::nullopt;
                    } else {
                        return std::unexpected(SystemError{
                            Operation::ReadChildError,
                            std::make_error_code(std::errc::protocol_error)
                        });
                    }
                }
            }
            return child_packet;
        }

        [[nodiscard]]
        auto apply_file_size_limit(std::uint64_t bytes)
            -> std::expected<void, SystemError> {
            
            rlim_t limit = static_cast<rlim_t>(bytes);
            rlimit limits{
                limit,
                limit
            };
            auto result = ::setrlimit(RLIMIT_FSIZE, &limits);
            if (result == -1) {
                const int saved_errno = errno;
                return std::unexpected(make_system_error(
                    Operation::SetFileSizeLimit,
                    saved_errno
                ));
            }
            return {};
        }

        [[nodiscard]]
        auto classify_termination_reason(const ChildStatus& status)
            -> TerminationReason {
            
            if (std::holds_alternative<Exited>(status)) {
                return TerminationReason::Exited;
            } else {
                const auto* signaled = std::get_if<Signaled>(&status);
                if (signaled->signal == SIGXCPU) {
                    return TerminationReason::CpuLimitExceeded; 
                } else if (signaled->signal == SIGXFSZ) {
                    return TerminationReason::FileSizeLimitExceeded;
                } else {
                    return TerminationReason::Signaled;
                }
            }
        }

        [[noreturn]]
        void execute_child(
            const Command &command,
            const std::vector<char *> &argument_pointers,
            const std::vector<char *> &environment_pointers,
            int error_fd,
            const ResourceLimits &limits
        ) {
            
            auto set_result = ::setpgid(0, 0);
            if (set_result == -1) {
                const int saved_errno = errno;
                ChildErrorPacket packet{
                    Operation::SetProcessGroup,
                    saved_errno
                };
                static_cast<void>(write_child_error_packet(error_fd, packet));
                ::_exit(126);
            }
            if (limits.cpu_time.has_value()) {
                auto set_limit_result = apply_cpu_limit(*(limits.cpu_time));
                if (!set_limit_result) {
                    auto error = set_limit_result.error();
                    ChildErrorPacket packet{
                        error.operation,
                        error.code.value()
                    };
                    static_cast<void>(write_child_error_packet(error_fd, packet));
                    ::_exit(126);
                }
            }
            if (limits.address_space_bytes.has_value()) {
                auto set_space_result = apply_address_space_limit(*(limits.address_space_bytes));
                if (!set_space_result) {
                    auto error = set_space_result.error();
                    ChildErrorPacket packet{
                        error.operation,
                        error.code.value()
                    };
                    static_cast<void>(write_child_error_packet(error_fd, packet));
                    ::_exit(126);
                }
            }
            if (limits.file_size_bytes.has_value()) {
                auto set_file_size_result = apply_file_size_limit(*limits.file_size_bytes);
                if (!set_file_size_result) {
                    auto error = set_file_size_result.error();
                    ChildErrorPacket packet{
                        error.operation,
                        error.code.value()
                    };
                    static_cast<void>(write_child_error_packet(error_fd, packet));
                    ::_exit(126);
                }
            }
            int result = ::execve(
                command.executable.c_str(),
                argument_pointers.data(),
                environment_pointers.data());
            if (result == -1)
            {
                const int saved_errno = errno;
                ChildErrorPacket packet{
                    Operation::Execve,
                    saved_errno
                };
                const auto write_result = write_child_error_packet(error_fd, packet);
                static_cast<void>(write_result);
                ::_exit(126);
            }
            ::_exit(126);
        }
    } // namespace

    std::expected<RunResult, SystemError> run(
        const RunRequest &request)
    {
        auto validation_result = validate_limits(request.limits);
        if (!validation_result)
        {
            return std::unexpected(validation_result.error());
        }
        const Command &command = request.command;
        auto argument_storage = make_argument_storage(command);
        auto argument_pointers = make_pointer_array(argument_storage);
        std::vector<std::string> environment_storage = command.environment;
        auto environment_pointers = make_pointer_array(environment_storage);
        const auto started_at = std::chrono::steady_clock::now();
        auto pipe_result = create_cloexec_pipe();
        if (!pipe_result) {
            return std::unexpected(pipe_result.error());
        }
        Pipe pipe = std::move(*pipe_result);

        auto fork_result = fork_process();
        if (!fork_result)
        {
            return std::unexpected(fork_result.error());
        }
        const pid_t child_pid = *fork_result;
        if (child_pid == 0)
        {
            pipe.read_end.reset();
            execute_child(command, argument_pointers, environment_pointers, pipe.write_end.get(), request.limits);
        }

        pipe.write_end.reset();
        auto child_error_result = read_child_error_packet(pipe.read_end.get());
        if (!child_error_result) {
            auto status_result = wait_for_child(child_pid);

            if (!status_result)
            {
                return std::unexpected(status_result.error());
            }
            return std::unexpected(child_error_result.error());
        }

        auto packet = *child_error_result;

        if (packet.has_value()) {
            auto status_result = wait_for_child(child_pid);

            if (!status_result)
            {
                return std::unexpected(status_result.error());
            }
            const auto finished_at = std::chrono::steady_clock::now();

            return RunResult{
                .status = *status_result,
                .reason = TerminationReason::ChildSetupFailed,
                .elapsed_wall_time = std::chrono::duration_cast<std::chrono::milliseconds>(
                    finished_at - started_at),
                .watchdog_sent_sigkill = false,
                .child_setup_error = make_system_error(
                    packet->operation,
                    packet->error_number
                ),
            };
        }

        auto status_result = wait_for_child(child_pid);

        if (!status_result)
        {
            return std::unexpected(status_result.error());
        }
        ChildStatus status = *status_result;
        TerminationReason reason = classify_termination_reason(status);
        const auto finished_at = std::chrono::steady_clock::now();
        return RunResult{
            .status = status,
            .reason = reason,
            .elapsed_wall_time = std::chrono::duration_cast<std::chrono::milliseconds>(
                finished_at - started_at),
            .watchdog_sent_sigkill = false,
            .child_setup_error = std::nullopt,
        };
    }

    std::expected<ChildStatus, SystemError> run(
        const Command &command)
    {
        RunRequest request{
            .command = command,
            .limits = ResourceLimits{},
        };
        auto result = run(request);
        if (!result)
        {
            return std::unexpected(result.error());
        }
        ChildStatus status = (*result).status;

        return status;
    }

} // namespace sandbox
