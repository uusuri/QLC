#pragma once

#include <expected>
#include <filesystem>
#include <string>
#include <system_error>
#include <variant>
#include <vector>

namespace sandbox {
    enum class Operation {
        Fork,
        Execve,
        Waitpid,
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

    struct Exited {
        int code;
    };

    struct Signaled {
        int signal;
    };
    
    using ChildStatus = std::variant<Exited, Signaled>;

    [[nodiscard]]
    auto run(const Command& command)
        -> std::expected<ChildStatus, SystemError>;
} // namespace sandbox