import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {parseVideoInput,parseTime,formatTime,validSegment,parseShare,makeShareUrl,normalizeSpeed,atSegmentEnd} from '../js/core.mjs';
const ID='M7lc1UVf-VE';
test('유튜브 URL/shorts/music/live/ID 파싱',()=>{
  for(const link of [ID,`https://youtu.be/${ID}`,`https://www.youtube.com/watch?v=${ID}`,`https://m.youtube.com/watch?v=${ID}`,`https://music.youtube.com/watch?v=${ID}`,`https://youtube.com/shorts/${ID}`,`https://youtube.com/live/${ID}`,`https://youtube-nocookie.com/embed/${ID}`]) assert.equal(parseVideoInput(link)?.id, ID);
});
test('URL 재생 시점 파싱',()=>{
  assert.equal(parseVideoInput(`https://youtu.be/${ID}?t=1m30s`).start,90);
  assert.equal(parseVideoInput(`https://youtube.com/watch?v=${ID}&start=103`).start,103);
});
test('악성 URL과 가짜 ID 거절',()=>{
  for(const input of ['javascript:alert(1)',`https://youtube.com.evil.org/watch?v=${ID}`,`https://evil.org/watch?v=${ID}`,`https://www.youtube.com/watch?v=invalid`, `https://youtu.be/${ID}/xx`, `https://youtube.com.evil.com/shorts/${ID}`, `https://youtube.com@evil.org/watch?v=${ID}`, '']) assert.equal(parseVideoInput(input),null,input);
});
test('숫자 및 시:분:초 시간 파싱',()=>{
  for(const [text,n] of [['30',30],['1:30',90],['01:02.350',62.35],['1:01:01',3661],['1h2m3.5s',3723.5],['1h30m',5400],['90s',90]]) assert.equal(parseTime(text),n,text);
});
test('시간 입력 검증',()=>{
  for(const s of ['','-20','00:79','1:02:70','abc','1h1h','1:','0.1.2']) assert.equal(parseTime(s),null,s);
});
test('시간 표기와 경계',()=>{
  assert.equal(formatTime(62.357,true),'01:02.357');assert.equal(formatTime(3661), '1:01:01');
  assert.equal(validSegment(1,2),true);assert.equal(validSegment(1,1.1),false);assert.equal(validSegment(2,1),false);assert.equal(validSegment(1,20,15),false);
});
test('공유 링크 roundtrip',()=>{
  const link=makeShareUrl('https://example.com/index.html?old=yes',{id:ID,a:12.345,b:19.5,mode:'segment',rate:1.5});
  assert.ok(!link.includes('old=yes'));let decoded=parseShare(new URL(link).search);
  assert.deepEqual(decoded,{id:ID,a:12.345,b:19.5,mode:'segment',rate:1.5,start:12.345});
});
test('유효하지 않은 공유 매개변수 처리',()=>{
  assert.equal(parseShare('?v=bad'),null);assert.equal(parseShare(`?v=${ID}&mode=segment&a=3&b=1`).mode,'full');
  assert.equal(parseShare(`?v=${ID}&rate=99`).rate,1);
  assert.equal(normalizeSpeed(1.6),1.5);
});
test('구간반복 점프 디바운스와 종료 감지',()=>{
  assert.equal(atSegmentEnd(10,10,100),false);assert.equal(atSegmentEnd(9.96,10,500),true);assert.equal(atSegmentEnd(9.5,10,500),false);
});
