def in_age_range(age):
    return 0 <= age <= 120

text = input()
try:
    age = int(text)
except ValueError:
    print('ЧИСЛО')
else:
    if in_age_range(age):
        print('ПРИНЯТО')
    else:
        print('ДИАПАЗОН')
