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
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)

        cropped = cvi[y:y + h, x:x + w]

        avg_per_row = np.average(cropped, axis=0)
        avg = np.average(avg_per_row, axis=0)[0]

        if avg < 120:
            cropped = cv2.bitwise_not(cropped)
            cvi[y:y + h, x:x + w] = cropped
            cvi_orig[y:y + h, x:x + w] = cropped

        cv2.rectangle(cvi_orig, (x, y), (x + w, y + h), (255, 0, 255), 1)

    # PROCESS PREPARED CANVAS

    gray = cv2.cvtColor(cvi, cv2.COLOR_BGR2GRAY)

    ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU | cv2.THRESH_BINARY_INV)
    #ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU)
    #ret, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV)
    #thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 8))

    dilation = cv2.dilate(thresh, rect_kernel, iterations = 1)

    contours, hierarchy = cv2.findContours(dilation, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # CONVERT RECTANGLES
    cvt = f'Rects: {str(len(contours))}\n' if isDebug else ''
    for cnt in reversed(contours):
        x, y, w, h = cv2.boundingRect(cnt)
        if h > 100:
            continue
        if x > img.width / 2:
            continue
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
        text = re.sub(r'^[. ]+', '', text)
        # 4.$ => 4$
        text = re.sub(r'(\d)[. ]+$', r'\1', text)
        # TODO
        text = text.replace('Силаатаки', 'Сила атаки')

        cvt += text

    cvt = re.sub(r'(\n\s*)+\n+', '\n\n', cvt)
    cvt = re.sub('[*\[\]\-]', '', cvt)

    # CONVERT TO PILLOW
    cvi_orig = cv2.cvtColor(cvi_orig, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(cvi_orig)

    # SEND IMAGE AND TEXT
    buffered = io.BytesIO()
    img.save(buffered, format='PNG')
    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
    answer = to_image(img_str, cvt) if isDebug else cvt

    return answer
