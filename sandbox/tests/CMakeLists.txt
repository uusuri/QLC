function(add_sandbox_fixture fixture_name)
    add_executable(sandbox_fixture_${fixture_name}
        fixtures/${fixture_name}.cpp
    )

    target_compile_features(sandbox_fixture_${fixture_name}
        PRIVATE
            cxx_std_23
    )

    set_target_properties(sandbox_fixture_${fixture_name}
        PROPERTIES
            CXX_EXTENSIONS OFF
    )

    target_compile_options(sandbox_fixture_${fixture_name}
        PRIVATE
            -Wall
            -Wextra
            -Wpedantic
            -Wconversion
            -Wshadow
    )
endfunction()

add_sandbox_fixture(hello)
add_sandbox_fixture(cpu_hog)
add_sandbox_fixture(memory_hog)
add_sandbox_fixture(file_hog)
add_sandbox_fixture(sleeper)