def discounted_price(price, percent=0):
    return price * (100 - percent) / 100

original_price = int(input())
discount = int(input())
answer = discounted_price(original_price, discount)
print(f'{answer:.2f}')
