#include <array>
#include <cstddef>
#include <filesystem>
#include <fstream>
#include <iostream>

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: sandbox_fixture_file_hog <output-path>\n";
        return 2;
    }
    std::filesystem::path file_path = argv[1];
    std::ofstream out(file_path, std::ios::binary | std::ios::trunc);
    if (!out.is_open()) {
        std::cerr << "Failed to open output file\n";
        return 3;
    }
    constexpr std::size_t chunk_size = 64 * 1024;
    std::array<char, chunk_size> chunk;
    chunk.fill('X');
    while (true) {
        out.write(
            chunk.data(),
            static_cast<std::streamsize>(chunk.size())
        );
        out.flush();

        if (!out) {
            std::cerr << "Failed to write output file\n";
            return 4;
        }
    }
}