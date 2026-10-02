first = input()
second = input()
try:
    a = int(first)
    b = int(second)
except ValueError:
    print('ОШИБКА')
else:
    print(a + b)
