def is_even(number):
    return number % 2 == 0

number = int(input())
if is_even(number):
    print('ДА')
else:
    print('НЕТ')
