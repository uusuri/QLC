import random
seed = int(input())
length = int(input())
random.seed(seed)
parts = []
for i in range(length):
    parts.append(random.choice('0123456789'))
print(''.join(parts))
