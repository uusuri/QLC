#include <cstddef>
#include <vector>

int main() {
    std::vector<std::vector<std::byte>> blocks;

    constexpr std::size_t block_size = 1024 * 1024;

    while (true) {
        blocks.emplace_back(
            block_size,
            std::byte{0x01}
        );
    }
}