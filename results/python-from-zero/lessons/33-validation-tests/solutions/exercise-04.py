def count_positive(numbers):
    count = 0
    for value in numbers:
        if value > 0:
            count += 1
    return count

assert count_positive([]) == 0
assert count_positive([-3]) == 0
assert count_positive([0]) == 0
assert count_positive([-1, 0, 2, 3]) == 2
print('ПРОВЕРЕНО')
