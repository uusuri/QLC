text = input()
length = len(text)
if length % 2 == 1:
    print(text[length // 2])
else:
    print('ДВА СРЕДНИХ')
