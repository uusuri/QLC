def count_positive(numbers):
    count = 0
    for value in numbers:
        if value > 0:
            count += 1
    return count

numbers = [int(token) for token in input().split()]
print(count_positive(numbers))
