cmake_minimum_required(VERSION 3.25)

project(sandbox
    VERSION 0.1.0
    DESCRIPTION "Linux sandbox learning module"
    LANGUAGES CXX
)

function(enable_sandbox_warnings target_name)
    target_compile_options(${target_name}
        PRIVATE
            -Wall
            -Wextra
            -Wpedantic
            -Wconversion
            -Wshadow
    )
endfunction()

option(
    SANDBOX_BUILD_RESOURCE_TESTS
    "Build resource-limit test fixtures"
    OFF
)

add_library(sandbox_core STATIC
    src/sandbox.cpp
)

add_executable(sandbox
    src/main.cpp
)

target_compile_features(sandbox_core
    PUBLIC
        cxx_std_23
)

set_target_properties(sandbox
    PROPERTIES
        CXX_EXTENSIONS OFF
)

set_target_properties(sandbox_core
    PROPERTIES
        CXX_EXTENSIONS OFF
)

target_include_directories(sandbox_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

enable_sandbox_warnings(sandbox_core)
enable_sandbox_warnings(sandbox)

target_link_libraries(sandbox
    PRIVATE
        sandbox_core
)

if(SANDBOX_BUILD_RESOURCE_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()