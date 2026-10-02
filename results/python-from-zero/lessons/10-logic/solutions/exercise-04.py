number = int(input())
by_three = number % 3 == 0
by_five = number % 5 == 0
if (by_three and not by_five) or (by_five and not by_three):
    print('ДА')
else:
    print('НЕТ')
