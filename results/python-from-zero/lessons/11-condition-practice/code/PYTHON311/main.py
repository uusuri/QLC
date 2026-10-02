year = int(input())
by_four = year % 4 == 0
by_hundred = year % 100 == 0
by_four_hundred = year % 400 == 0
if by_four_hundred or (by_four and not by_hundred):
    print('ДА')
else:
    print('НЕТ')
