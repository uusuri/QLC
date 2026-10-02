def play(secret, attempt_limit):
    for attempt in range(1, attempt_limit + 1):
        guess = int(input())
        if guess == secret:
            print('УГАДАНО', attempt)
            return
        if guess < secret:
            print('БОЛЬШЕ')
        else:
            print('МЕНЬШЕ')
    print('ПОПЫТКИ ЗАКОНЧИЛИСЬ')

import random

print('Угадайте число от 1 до 100. У вас 7 попыток.')
secret = random.randint(1, 100)
play(secret, 7)
