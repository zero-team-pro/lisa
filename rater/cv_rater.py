import sys
import io
import requests
import base64
import pytesseract
import cv2
import numpy as np
import re
    
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


def json(**kwargs):
    return kwargs


def to_image(image, text):
    return json(status='image', image=image, text=text)


def processCountor(countor, img, cvi, cvi_orig, lang, yMin, yMax):
    x, y, w, h = cv2.boundingRect(countor)
    if h > 100:
        return
    if x > img.width / 2:
        return
    if y < yMin:
        return
    if y > yMax:
        return

    cv2.rectangle(cvi_orig, (x, y), (x + w, y + h), (0, 255, 0), 2)

    cropped = cvi[y:y + h, x:x + w]

    text = pytesseract.image_to_string(cropped, lang=lang, config="--oem 3 --psm 7")
    if len(text) < 2:
        text = pytesseract.image_to_string(cropped, lang=lang, config="--oem 3 --psm 9")

    # 4. 780 => 4780
    text = re.sub(r'(\d)[. ]+(\d)', r'\1\2', text)
    # DMGt5 => DMG +5
    text = re.sub(r'(\w)[ ]?[ ]?t(\d)', r'\1 \+\2', text)
    # 4 780 => 4780
    text = re.sub(r'(\d)[ ]+(\d)', r'\1\2', text)
    # . some => some
    text = re.sub(r'^[,. ]+', '', text)
    # 4.$ => 4$
    text = re.sub(r'(\d)[. ]+$', r'\1', text)
    # 311% => 31.1%
    text = re.sub(r'(\d\d)(\d)%', r'\1,\2%', text)
    # TODO
    text = text.replace('Силаатаки', 'Сила атаки')
    # TODO https://docs.opencv.org/3.4/d4/d76/tutorial_js_morphological_ops.html
    text = re.sub(r'х[х]+', '', text)

    return text


def to_text(url, lang='eng', isDebug=False):
    print(f'OpenCV started for {url}', file=sys.stderr)

    res = requests.get(url)
    img = Image.open(io.BytesIO(res.content))

    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(3)
    #img = img.convert('L')
    # Image converted to contrast gray

    # PILLOW PREPROCESSING
    #threshold = 150
    #img = img.point(lambda p: p > threshold and 255)
    #enhancer = ImageEnhance.Contrast(img)
    #img = enhancer.enhance(2)
    #enhancer = ImageEnhance.Sharpness(img)
    #img = enhancer.enhance(300)

    #img = img.filter(ImageFilter.MaxFilter(3))
    #img = img.filter(ImageFilter.MinFilter(3))

    #img = ImageOps.invert(img)

    # CONVERT TO OPENCV
    img = img.convert('RGB')
    cvi = np.array(img)
    cvi = cv2.cvtColor(cvi, cv2.COLOR_RGB2BGR)
    cvi_orig = cvi.copy()

    # OPENCV
    #cvi = cv2.resize(cvi, None, fx=3, fy=3)

    # CONVERT TO BLACK ON WHITE

    gray = cv2.cvtColor(cvi, cv2.COLOR_BGR2GRAY)

    ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU | cv2.THRESH_BINARY_INV)
    rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (10, 5))
    dilation = cv2.dilate(thresh, rect_kernel, iterations = 1)
    contours, hierarchy = cv2.findContours(dilation, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # CONVERT RECTANGLES
    middleLine = None
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)

        cropped = cvi[y:y + h, x:x + w]

        avg_per_row = np.average(cropped, axis=0)
        avg = np.average(avg_per_row, axis=0)[0]

        if avg < 120:
            cropped = cv2.bitwise_not(cropped)
            cvi[y:y + h, x:x + w] = cropped
            cvi_orig[y:y + h, x:x + w] = cropped
            by = y + h
            if not middleLine and by > img.height / 10 and by < img.height / 10:
                middleLine = by

        cv2.rectangle(cvi_orig, (x, y), (x + w, y + h), (255, 0, 255), 1)
    
    if not middleLine:
        middleLine = img.height / 2

    # PROCESS PREPARED CANVAS

    gray = cv2.cvtColor(cvi, cv2.COLOR_BGR2GRAY)

    ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU)
    ret, thresh_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU | cv2.THRESH_BINARY_INV)
    #ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV)
    #thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

    rect_kernel_top = cv2.getStructuringElement(cv2.MORPH_RECT, (12, 5))
    rect_kernel_bottom = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 5))
    
    dilation_top = cv2.dilate(thresh, rect_kernel_top, iterations = 1)
    dilation_top_inv = cv2.dilate(thresh_inv, rect_kernel_top, iterations = 1)
    dilation_bottom = cv2.dilate(thresh, rect_kernel_bottom, iterations = 1)
    dilation_bottom_inv = cv2.dilate(thresh_inv, rect_kernel_bottom, iterations = 1)

    # TODO: Optimize
    contours_top, hierarchy = cv2.findContours(dilation_top, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours_top_inv, hierarchy = cv2.findContours(dilation_top_inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours_bottom, hierarchy = cv2.findContours(dilation_bottom, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours_bottom_inv, hierarchy = cv2.findContours(dilation_bottom_inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # TODO: Unique
    contours_top = contours_top[::-1] if len(contours_top) > len(contours_top_inv) else contours_top_inv[::-1]
    contours_bottom = contours_bottom[::-1] if len(contours_bottom) > len(contours_bottom_inv) else contours_bottom_inv[::-1]

    # CONVERT RECTANGLES
    cvt = ''
    cvt_d = f'Rects: {str(len(contours_top) + len(contours_bottom))} \n'
    cvt_d += f'{str(middleLine)} \n'
    cvt_d += f'{str(len(contours_top))} \n'
    cvt_d += f'{str(len(contours_top_inv))} \n'
    cvt_d += f'{str(len(contours_bottom))} \n'
    cvt_d += f'{str(len(contours_bottom_inv))} \n'
    cvt_d += '==========\n'

    # TODO: Precision
    for cnt in contours_top:
        text = processCountor(cnt, img, cvi, cvi_orig, lang, 0, middleLine)
        if text:
            cvt += text

    for cnt in contours_bottom:
        text = processCountor(cnt, img, cvi, cvi_orig, lang, middleLine, img.height)
        if text:
            cvt += text

    cvt = re.sub(r'(\n\s*)+\n+', '\n\n', cvt)
    # Extra new lines
    cvt = re.sub(r'[\f\r\n]+', '\n', cvt)
    cvt = re.sub('[*\[\]\-]', '', cvt)

    with open('last_rate.txt', 'w', encoding='utf8', errors='ignore') as text_file:
        text_file.write(cvt)

    # 4. \n123 => 4123
    cvt = re.sub(r'(\d+)[,. ]*\n(\d+)', r'\1\2', cvt)

    # CONVERT TO PILLOW
    cvi_orig = cv2.cvtColor(cvi_orig, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(cvi_orig)

    # SEND IMAGE AND TEXT
    if isDebug:
        cvt = cvt_d + cvt
    buffered = io.BytesIO()
    img.save(buffered, format='PNG')
    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
    answer = to_image(img_str, cvt) if isDebug else cvt

    return answer
