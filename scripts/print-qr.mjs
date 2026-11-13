#!/usr/bin/env node
// 터미널에 접속 URL용 QR 코드를 출력하는 유틸리티 스크립트
import QRCode from 'qrcode';

const url = process.argv[2];
if (!url) {
  process.exit(1);
}

const qrText = await QRCode.toString(url, { type: 'terminal', small: true });
console.log(qrText);
