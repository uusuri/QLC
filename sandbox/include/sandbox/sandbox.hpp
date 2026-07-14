#pragma once

#include <chrono>
#include <cstdint>
#include <expected>
#include <filesystem>
#include <optional>
#include <string>
#include <system_error>
#include <variant>
#include <vector>

namespace sandbox {
    enum class Operation {
        Fork,
        Execve,
        Waitpid,
        ValidateLimits,
        CreatePipe,
        GetDescriptorFlags,
        SetDescriptorFlags,
        ReadChildError,
        SetProcessGroup,
        SetCpuLimit,
        SetAddressSpaceLimit,
        SetFileSizeLimit,
    };

    enum class TerminationReason {
        Exited,
        Signaled,
        CpuLimitExceeded,
        WallTimeExceeded,
        FileSizeLimitExceeded,
        ChildSetupFailed,
    };

    struct ResourceLimits {
        std::optional<std::chrono::seconds> cpu_time{};
        std::optional<std::chrono::milliseconds> wall_time{};
        std::optional<std::uint64_t> address_space_bytes{};
        std::optional<std::uint64_t> file_size_bytes{};
    };

    struct SystemError {
        Operation operation;
        std::error_code code;
    };

    struct Command {
        std::filesystem::path executable;
        std::vector<std::string> arguments;
        std::vector<std::string> environment;
    };

    struct RunRequest {
        Command command;
        ResourceLimits limits;
    };

    struct Exited {
        int code;
    };

    struct Signaled {
        int signal;
    };

    using ChildStatus = std::variant<Exited, Signaled>;

    struct RunResult {
        ChildStatus status;
        TerminationReason reason;
        std::chrono::milliseconds elapsed_wall_time;
        bool watchdog_sent_sigkill;
        std::optional<SystemError> child_setup_error{};
    };

    [[nodiscard]]
    auto run(const RunRequest& request)
        -> std::expected<RunResult, SystemError>;

    [[nodiscard]]
    auto run(const Command& command)
        -> std::expected<ChildStatus, SystemError>;
} // namespace sandbox