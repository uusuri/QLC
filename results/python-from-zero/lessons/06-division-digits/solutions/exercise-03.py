number = int(input())
hundreds = number // 100
tens = number // 10 % 10
ones = number % 10
print(hundreds + tens + ones)
