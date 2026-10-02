def money_text(kopecks):
    sign = ''
    if kopecks < 0:
        sign = '-'
    value = abs(kopecks)
    return f'{sign}{value // 100}.{value % 100:02d}'

kopecks = int(input())
print(money_text(kopecks))
