#include <atomic>
#include <cstdint>

int main() {
    std::atomic<std::uint64_t> cnt = 0;

    while (true) {
        cnt.fetch_add(1, std::memory_order_relaxed);
    }
}