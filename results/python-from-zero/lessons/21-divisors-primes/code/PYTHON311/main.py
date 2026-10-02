n = int(input())
is_prime = n >= 2
divisor = 2
while is_prime and divisor * divisor <= n:
    if n % divisor == 0:
        is_prime = False
        break
    divisor += 1
if is_prime:
    print('ДА')
else:
    print('НЕТ')
