cmake_minimum_required(VERSION 3.25)

project(sandbox
    VERSION 0.1.0
    DESCRIPTION "Linux sandbox learning module"
    LANGUAGES CXX
)

option(
    SANDBOX_BUILD_RESOURCE_TESTS
    "Build resource-limit test fixtures"
    OFF
)

add_executable(sandbox
    src/main.cpp
    src/sandbox.cpp
)

target_compile_features(sandbox
    PRIVATE
        cxx_std_23
)

set_target_properties(sandbox
    PROPERTIES
        CXX_EXTENSIONS OFF
)

target_include_directories(sandbox
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_compile_options(sandbox
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
        -Wconversion
        -Wshadow
)

if(SANDBOX_BUILD_RESOURCE_TESTS)
    add_subdirectory(tests)
endif()

# TODO: позже добавим отдельную библиотеку sandbox_core,
# чтобы main.cpp был тонким CLI-слоем, а логика жила в src/.
# enable_testing() после того, как защиту реализую