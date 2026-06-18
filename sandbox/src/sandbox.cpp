#include "sandbox/sandbox.hpp"

#include <cerrno>
#include <expected>
#include <string>
#include <vector>

#include <sys/wait.h>
#include <unistd.h>

namespace sandbox {
namespace {
    [[nodiscard]]
    SystemError make_system_error(
        Operation operation,
        int error_number
    ) {
        std::error_code code{error_number, std::generic_category()};
        SystemError system_error{operation, code};
        return system_error;
    }

    [[nodiscard]]
    std::vector<std::string> make_argument_storage(
        const Command& command
    ) {
        std::vector<std::string> storage;
        storage.reserve(command.arguments.size() + 1);
        storage.push_back(command.executable.string());
        storage.insert(
            storage.end(),
            command.arguments.begin(),
            command.arguments.end()
        );
        return storage;
    }
    
    [[nodiscard]]
    std::vector<char*> make_pointer_array(
        std::vector<std::string>& storage
    ) {
        std::vector<char*> pointer_array;
        pointer_array.reserve(storage.size() + 1);
        for (std::string& str : storage) {
            pointer_array.push_back(str.data());
        }
        pointer_array.push_back(nullptr);
        return pointer_array;
    }

    [[nodiscard]]
    std::expected<pid_t, SystemError> fork_process() {
        pid_t result = ::fork();
        if (result == -1) {
            const int saved_errno = errno;
            return std::unexpected(
                make_system_error(
                    Operation::Fork,
                    saved_errno
                )
            );
        }
        
        return result;
    }

    [[nodiscard]]
    std::expected<ChildStatus, SystemError> wait_for_child(
        pid_t child_pid
    ) {
        int status = 0;
        while (true) {
            pid_t result = ::waitpid(child_pid, &status, 0);

            if (result == -1) {
                const int saved_errno = errno;
                if (saved_errno == EINTR) {
                    continue;
                }
                return std::unexpected(
                    make_system_error(
                        Operation::Waitpid,
                        saved_errno
                    )
                );
            } else {
                break;
            }
        }
        if (WIFEXITED(status)) {
            int code = WEXITSTATUS(status);
            return ChildStatus{Exited{code}};
        }
        if (WIFSIGNALED(status)) {
            int code = WTERMSIG(status);
            return ChildStatus{Signaled{code}};
        }
        return std::unexpected(SystemError{
            Operation::Waitpid,
            std::make_error_code(std::errc::state_not_recoverable)
        });
    }

    [[noreturn]]
    void execute_child(
        const Command& command,
        const std::vector<char*>& argument_pointers,
        const std::vector<char*>& environment_pointers
    ) {
        int result = ::execve(
            command.executable.c_str(),
            argument_pointers.data(),
            environment_pointers.data()
        );
        if (result == -1) {
            const int saved_errno = errno;
            if (saved_errno == ENOENT) {
                ::_exit(127);
            }
            ::_exit(126);
        }
        ::_exit(126);
    }
} // namespace

std::expected<ChildStatus, SystemError> run(
    const Command& command
) {
    auto argument_storage = make_argument_storage(command);
    auto argument_pointers = make_pointer_array(argument_storage);
    std::vector<std::string> environment_storage = command.environment;
    auto environment_pointers = make_pointer_array(environment_storage);
    auto fork_result = fork_process();
    if (!fork_result) {
        return std::unexpected(fork_result.error());
    }
    const pid_t child_pid = *fork_result;
    if (child_pid == 0) {
        execute_child(command, argument_pointers, environment_pointers);
    }
    return wait_for_child(child_pid);
}

} // namespace sandbox
