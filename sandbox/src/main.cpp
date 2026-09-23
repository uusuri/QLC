#include "sandbox/sandbox.hpp"

#include <charconv>
#include <chrono>
#include <csignal>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <limits>
#include <optional>
#include <string_view>
#include <utility>
#include <variant>

namespace {
    struct CliOptions {
        std::uint64_t memory_limit_kb;
        std::uint64_t time_limit_ms;
        std::uint64_t output_limit_kb;
        int executable_index;
    };

    void print_usage() {
        std::cerr
            << "Usage: qlc-sandbox --memory-kb <value> --time-ms <value> "
            << "--output-kb <value> <executable> [arguments...]\n";
    }

    std::optional<std::uint64_t> parse_positive_integer(std::string_view value) {
        std::uint64_t parsed = 0;
        const auto [end, error] = std::from_chars(
            value.data(),
            value.data() + value.size(),
            parsed);
        if (error != std::errc{} || end != value.data() + value.size() || parsed == 0) {
            return std::nullopt;
        }
        return parsed;
    }

    std::optional<CliOptions> parse_options(int argc, char* argv[]) {
        std::optional<std::uint64_t> memory_limit_kb;
        std::optional<std::uint64_t> time_limit_ms;
        std::optional<std::uint64_t> output_limit_kb;
        int index = 1;

        while (index < argc && std::string_view{argv[index]}.starts_with("--")) {
            const std::string_view option{argv[index]};
            if (option == "--help") {
                return std::nullopt;
            }
            if (index + 1 >= argc) {
                return std::nullopt;
            }

            const auto value = parse_positive_integer(argv[index + 1]);
            if (!value.has_value()) {
                return std::nullopt;
            }
            if (option == "--memory-kb" && !memory_limit_kb.has_value()) {
                memory_limit_kb = value;
            } else if (option == "--time-ms" && !time_limit_ms.has_value()) {
                time_limit_ms = value;
            } else if (option == "--output-kb" && !output_limit_kb.has_value()) {
                output_limit_kb = value;
            } else {
                return std::nullopt;
            }
            index += 2;
        }

        if (!memory_limit_kb.has_value()
            || !time_limit_ms.has_value()
            || !output_limit_kb.has_value()
            || index >= argc) {
            return std::nullopt;
        }
        return CliOptions{
            .memory_limit_kb = *memory_limit_kb,
            .time_limit_ms = *time_limit_ms,
            .output_limit_kb = *output_limit_kb,
            .executable_index = index,
        };
    }

    std::optional<std::uint64_t> kilobytes_to_bytes(std::uint64_t kilobytes) {
        constexpr std::uint64_t bytes_per_kilobyte = 1024;
        if (kilobytes > std::numeric_limits<std::uint64_t>::max() / bytes_per_kilobyte) {
            return std::nullopt;
        }
        return kilobytes * bytes_per_kilobyte;
    }
}

int main(int argc, char* argv[]) {
    const auto options = parse_options(argc, argv);
    if (!options.has_value()) {
        print_usage();
        return 2;
    }

    const auto memory_limit_bytes = kilobytes_to_bytes(options->memory_limit_kb);
    const auto output_limit_bytes = kilobytes_to_bytes(options->output_limit_kb);
    using MillisecondsRep = std::chrono::milliseconds::rep;
    if (!memory_limit_bytes.has_value()
        || !output_limit_bytes.has_value()
        || options->time_limit_ms > static_cast<std::uint64_t>(std::numeric_limits<MillisecondsRep>::max())) {
        std::cerr << "Resource limit is too large\n";
        return 2;
    }

    const std::uint64_t cpu_seconds = options->time_limit_ms / 1000
        + (options->time_limit_ms % 1000 == 0 ? 0 : 1);
    if (cpu_seconds > static_cast<std::uint64_t>(
            std::numeric_limits<std::chrono::seconds::rep>::max())) {
        std::cerr << "Time limit is too large\n";
        return 2;
    }

    sandbox::Command command;
    command.executable = argv[options->executable_index];
    command.arguments.reserve(static_cast<std::size_t>(argc - options->executable_index - 1));
    for (int i = options->executable_index + 1; i < argc; ++i) {
        command.arguments.emplace_back(argv[i]);
    }

    sandbox::RunRequest request{
        .command = std::move(command),
        .limits = sandbox::ResourceLimits{
            .cpu_time = std::chrono::seconds{static_cast<std::chrono::seconds::rep>(cpu_seconds)},
            .wall_time = std::chrono::milliseconds{static_cast<MillisecondsRep>(options->time_limit_ms)},
            .address_space_bytes = *memory_limit_bytes,
            .file_size_bytes = *output_limit_bytes,
        },
    };

    auto result = sandbox::run(request);
    if (!result) {
        const sandbox::SystemError& error = result.error();
        std::cerr << error.code.message() << '\n';
        return 1;
    }

    switch (result->reason) {
        case sandbox::TerminationReason::WallTimeExceeded:
            return 124;
        case sandbox::TerminationReason::CpuLimitExceeded:
            return 128 + SIGXCPU;
        case sandbox::TerminationReason::FileSizeLimitExceeded:
            return 128 + SIGXFSZ;
        case sandbox::TerminationReason::ChildSetupFailed:
            return 126;
        case sandbox::TerminationReason::Exited:
        case sandbox::TerminationReason::Signaled:
            break;
    }

    const sandbox::ChildStatus& status = result->status;
    if (std::holds_alternative<sandbox::Exited>(status)) {
        const sandbox::Exited& exited = std::get<sandbox::Exited>(status);
        return exited.code;
    }
    const sandbox::Signaled& signaled = std::get<sandbox::Signaled>(status);
    return 128 + signaled.signal;
}
