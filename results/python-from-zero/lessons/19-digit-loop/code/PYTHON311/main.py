number = int(input())
remaining = number
digit_sum = 0
digit_count = 0
if remaining == 0:
    digit_count = 1
while remaining > 0:
    digit = remaining % 10
    digit_sum += digit
    digit_count += 1
    remaining //= 10
print(digit_sum, digit_count)
