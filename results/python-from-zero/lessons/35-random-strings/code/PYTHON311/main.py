import random

def generate_password(length):
    alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    parts = []
    for i in range(length):
        parts.append(random.choice(alphabet))
    return ''.join(parts)

seed = int(input())
length = int(input())
random.seed(seed)
print(generate_password(length))
