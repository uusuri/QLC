cmake_minimum_required(VERSION 3.25)

project(sandbox
    VERSION 0.1.0
    DESCRIPTION "Linux sandbox learning module"
    LANGUAGES CXX
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

# TODO: позже добавим отдельную библиотеку sandbox_core,
# чтобы main.cpp был тонким CLI-слоем, а логика жила в src/.
#
# TODO: позже подключим tests/ через enable_testing()
# и add_subdirectory(tests).