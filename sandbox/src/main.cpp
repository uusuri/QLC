#include "sandbox/sandbox.hpp"

#include <cstddef>
#include <iostream>
#include <variant>

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: sandbox <executable> [arguments...]\n";
        return 2;
    }
    sandbox::Command command;
    command.arguments.reserve(static_cast<std::size_t>(argc - 2));
    command.executable = argv[1];
    for (int i = 2; i < argc; ++i) {
        command.arguments.emplace_back(argv[i]);
    }
    auto result = sandbox::run(command);
    if (!result) {
        const sandbox::SystemError& error = result.error();
        std::cerr << error.code.message() << '\n';
        return 1;
    }
    const sandbox::ChildStatus& status = *result;
    if (std::holds_alternative<sandbox::Exited>(status)) {
        const sandbox::Exited& exited = std::get<sandbox::Exited>(status);
        return exited.code;
    }
    const sandbox::Signaled& signaled = std::get<sandbox::Signaled>(status);
    return 128 + signaled.signal;
}