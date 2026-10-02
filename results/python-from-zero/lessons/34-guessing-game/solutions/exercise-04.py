def play(secret, attempt_limit):
    for attempt in range(1, attempt_limit + 1):
        text = input()
        if text == 'выход':
            print('ВЫХОД')
            return
        guess = int(text)
        if guess == secret:
            print('УГАДАНО', attempt)
            return
        if guess < secret:
            print('БОЛЬШЕ')
        else:
            print('МЕНЬШЕ')
    print('ПОПЫТКИ ЗАКОНЧИЛИСЬ')

secret = int(input())
attempt_limit = int(input())
play(secret, attempt_limit)
