def money_text(kopecks):
    sign = ''
    if kopecks < 0:
        sign = '-'
    value = abs(kopecks)
    return f'{sign}{value // 100}.{value % 100:02d}'

def largest_purchase_index(purchases):
    if len(purchases) == 0:
        return -1
    best_index = 0
    for index in range(1, len(purchases)):
        if purchases[index][1] > purchases[best_index][1]:
            best_index = index
    return best_index

budget = int(input())
n = int(input())
purchases = []
for i in range(n):
    name = input()
    amount = int(input())
    purchases.append([name, amount])
total = 0
for purchase in purchases:
    total += purchase[1]
best_index = largest_purchase_index(purchases)
print('ИТОГО', money_text(total))
print('ОСТАТОК', money_text(budget - total))
if best_index == -1:
    print('НЕТ ПОКУПОК')
else:
    print('ПОКУПКА', purchases[best_index][0])
