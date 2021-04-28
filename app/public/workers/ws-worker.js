(function () {
  'use strict';

  /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
  var read = function (buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = (nBytes * 8) - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? (nBytes - 1) : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];

    i += d;

    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity)
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
  };

  var write = function (buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = (nBytes * 8) - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
    var i = isLE ? 0 : (nBytes - 1);
    var d = isLE ? 1 : -1;
    var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = ((value * c) - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

    buffer[offset + i - d] |= s * 128;
  };

  var ieee754 = {
  	read: read,
  	write: write
  };

  var pbf = Pbf;



  function Pbf(buf) {
      this.buf = ArrayBuffer.isView && ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf || 0);
      this.pos = 0;
      this.type = 0;
      this.length = this.buf.length;
  }

  Pbf.Varint  = 0; // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
  Pbf.Fixed64 = 1; // 64-bit: double, fixed64, sfixed64
  Pbf.Bytes   = 2; // length-delimited: string, bytes, embedded messages, packed repeated fields
  Pbf.Fixed32 = 5; // 32-bit: float, fixed32, sfixed32

  var SHIFT_LEFT_32 = (1 << 16) * (1 << 16),
      SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32;

  // Threshold chosen based on both benchmarking and knowledge about browser string
  // data structures (which currently switch structure types at 12 bytes or more)
  var TEXT_DECODER_MIN_LENGTH = 12;
  var utf8TextDecoder = typeof TextDecoder === 'undefined' ? null : new TextDecoder('utf8');

  Pbf.prototype = {

      destroy: function() {
          this.buf = null;
      },

      // === READING =================================================================

      readFields: function(readField, result, end) {
          end = end || this.length;

          while (this.pos < end) {
              var val = this.readVarint(),
                  tag = val >> 3,
                  startPos = this.pos;

              this.type = val & 0x7;
              readField(tag, result, this);

              if (this.pos === startPos) this.skip(val);
          }
          return result;
      },

      readMessage: function(readField, result) {
          return this.readFields(readField, result, this.readVarint() + this.pos);
      },

      readFixed32: function() {
          var val = readUInt32(this.buf, this.pos);
          this.pos += 4;
          return val;
      },

      readSFixed32: function() {
          var val = readInt32(this.buf, this.pos);
          this.pos += 4;
          return val;
      },

      // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

      readFixed64: function() {
          var val = readUInt32(this.buf, this.pos) + readUInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
          this.pos += 8;
          return val;
      },

      readSFixed64: function() {
          var val = readUInt32(this.buf, this.pos) + readInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32;
          this.pos += 8;
          return val;
      },

      readFloat: function() {
          var val = ieee754.read(this.buf, this.pos, true, 23, 4);
          this.pos += 4;
          return val;
      },

      readDouble: function() {
          var val = ieee754.read(this.buf, this.pos, true, 52, 8);
          this.pos += 8;
          return val;
      },

      readVarint: function(isSigned) {
          var buf = this.buf,
              val, b;

          b = buf[this.pos++]; val  =  b & 0x7f;        if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val;
          b = buf[this.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val;
          b = buf[this.pos];   val |= (b & 0x0f) << 28;

          return readVarintRemainder(val, isSigned, this);
      },

      readVarint64: function() { // for compatibility with v2.0.1
          return this.readVarint(true);
      },

      readSVarint: function() {
          var num = this.readVarint();
          return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
      },

      readBoolean: function() {
          return Boolean(this.readVarint());
      },

      readString: function() {
          var end = this.readVarint() + this.pos;
          var pos = this.pos;
          this.pos = end;

          if (end - pos >= TEXT_DECODER_MIN_LENGTH && utf8TextDecoder) {
              // longer strings are fast with the built-in browser TextDecoder API
              return readUtf8TextDecoder(this.buf, pos, end);
          }
          // short strings are fast with our custom implementation
          return readUtf8(this.buf, pos, end);
      },

      readBytes: function() {
          var end = this.readVarint() + this.pos,
              buffer = this.buf.subarray(this.pos, end);
          this.pos = end;
          return buffer;
      },

      // verbose for performance reasons; doesn't affect gzipped size

      readPackedVarint: function(arr, isSigned) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readVarint(isSigned));
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readVarint(isSigned));
          return arr;
      },
      readPackedSVarint: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSVarint());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readSVarint());
          return arr;
      },
      readPackedBoolean: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readBoolean());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readBoolean());
          return arr;
      },
      readPackedFloat: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFloat());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readFloat());
          return arr;
      },
      readPackedDouble: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readDouble());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readDouble());
          return arr;
      },
      readPackedFixed32: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFixed32());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readFixed32());
          return arr;
      },
      readPackedSFixed32: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed32());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readSFixed32());
          return arr;
      },
      readPackedFixed64: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readFixed64());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readFixed64());
          return arr;
      },
      readPackedSFixed64: function(arr) {
          if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed64());
          var end = readPackedEnd(this);
          arr = arr || [];
          while (this.pos < end) arr.push(this.readSFixed64());
          return arr;
      },

      skip: function(val) {
          var type = val & 0x7;
          if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
          else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos;
          else if (type === Pbf.Fixed32) this.pos += 4;
          else if (type === Pbf.Fixed64) this.pos += 8;
          else throw new Error('Unimplemented type: ' + type);
      },

      // === WRITING =================================================================

      writeTag: function(tag, type) {
          this.writeVarint((tag << 3) | type);
      },

      realloc: function(min) {
          var length = this.length || 16;

          while (length < this.pos + min) length *= 2;

          if (length !== this.length) {
              var buf = new Uint8Array(length);
              buf.set(this.buf);
              this.buf = buf;
              this.length = length;
          }
      },

      finish: function() {
          this.length = this.pos;
          this.pos = 0;
          return this.buf.subarray(0, this.length);
      },

      writeFixed32: function(val) {
          this.realloc(4);
          writeInt32(this.buf, val, this.pos);
          this.pos += 4;
      },

      writeSFixed32: function(val) {
          this.realloc(4);
          writeInt32(this.buf, val, this.pos);
          this.pos += 4;
      },

      writeFixed64: function(val) {
          this.realloc(8);
          writeInt32(this.buf, val & -1, this.pos);
          writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
          this.pos += 8;
      },

      writeSFixed64: function(val) {
          this.realloc(8);
          writeInt32(this.buf, val & -1, this.pos);
          writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
          this.pos += 8;
      },

      writeVarint: function(val) {
          val = +val || 0;

          if (val > 0xfffffff || val < 0) {
              writeBigVarint(val, this);
              return;
          }

          this.realloc(4);

          this.buf[this.pos++] =           val & 0x7f  | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
          this.buf[this.pos++] =   (val >>> 7) & 0x7f;
      },

      writeSVarint: function(val) {
          this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2);
      },

      writeBoolean: function(val) {
          this.writeVarint(Boolean(val));
      },

      writeString: function(str) {
          str = String(str);
          this.realloc(str.length * 4);

          this.pos++; // reserve 1 byte for short string length

          var startPos = this.pos;
          // write the string directly to the buffer and see how much was written
          this.pos = writeUtf8(this.buf, str, this.pos);
          var len = this.pos - startPos;

          if (len >= 0x80) makeRoomForExtraLength(startPos, len, this);

          // finally, write the message length in the reserved place and restore the position
          this.pos = startPos - 1;
          this.writeVarint(len);
          this.pos += len;
      },

      writeFloat: function(val) {
          this.realloc(4);
          ieee754.write(this.buf, val, this.pos, true, 23, 4);
          this.pos += 4;
      },

      writeDouble: function(val) {
          this.realloc(8);
          ieee754.write(this.buf, val, this.pos, true, 52, 8);
          this.pos += 8;
      },

      writeBytes: function(buffer) {
          var len = buffer.length;
          this.writeVarint(len);
          this.realloc(len);
          for (var i = 0; i < len; i++) this.buf[this.pos++] = buffer[i];
      },

      writeRawMessage: function(fn, obj) {
          this.pos++; // reserve 1 byte for short message length

          // write the message directly to the buffer and see how much was written
          var startPos = this.pos;
          fn(obj, this);
          var len = this.pos - startPos;

          if (len >= 0x80) makeRoomForExtraLength(startPos, len, this);

          // finally, write the message length in the reserved place and restore the position
          this.pos = startPos - 1;
          this.writeVarint(len);
          this.pos += len;
      },

      writeMessage: function(tag, fn, obj) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeRawMessage(fn, obj);
      },

      writePackedVarint:   function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedVarint, arr);   },
      writePackedSVarint:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSVarint, arr);  },
      writePackedBoolean:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedBoolean, arr);  },
      writePackedFloat:    function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFloat, arr);    },
      writePackedDouble:   function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedDouble, arr);   },
      writePackedFixed32:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFixed32, arr);  },
      writePackedSFixed32: function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSFixed32, arr); },
      writePackedFixed64:  function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFixed64, arr);  },
      writePackedSFixed64: function(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSFixed64, arr); },

      writeBytesField: function(tag, buffer) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeBytes(buffer);
      },
      writeFixed32Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeFixed32(val);
      },
      writeSFixed32Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeSFixed32(val);
      },
      writeFixed64Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeFixed64(val);
      },
      writeSFixed64Field: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeSFixed64(val);
      },
      writeVarintField: function(tag, val) {
          this.writeTag(tag, Pbf.Varint);
          this.writeVarint(val);
      },
      writeSVarintField: function(tag, val) {
          this.writeTag(tag, Pbf.Varint);
          this.writeSVarint(val);
      },
      writeStringField: function(tag, str) {
          this.writeTag(tag, Pbf.Bytes);
          this.writeString(str);
      },
      writeFloatField: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed32);
          this.writeFloat(val);
      },
      writeDoubleField: function(tag, val) {
          this.writeTag(tag, Pbf.Fixed64);
          this.writeDouble(val);
      },
      writeBooleanField: function(tag, val) {
          this.writeVarintField(tag, Boolean(val));
      }
  };

  function readVarintRemainder(l, s, p) {
      var buf = p.buf,
          h, b;

      b = buf[p.pos++]; h  = (b & 0x70) >> 4;  if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 3;  if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s);
      b = buf[p.pos++]; h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s);

      throw new Error('Expected varint not more than 10 bytes');
  }

  function readPackedEnd(pbf) {
      return pbf.type === Pbf.Bytes ?
          pbf.readVarint() + pbf.pos : pbf.pos + 1;
  }

  function toNum(low, high, isSigned) {
      if (isSigned) {
          return high * 0x100000000 + (low >>> 0);
      }

      return ((high >>> 0) * 0x100000000) + (low >>> 0);
  }

  function writeBigVarint(val, pbf) {
      var low, high;

      if (val >= 0) {
          low  = (val % 0x100000000) | 0;
          high = (val / 0x100000000) | 0;
      } else {
          low  = ~(-val % 0x100000000);
          high = ~(-val / 0x100000000);

          if (low ^ 0xffffffff) {
              low = (low + 1) | 0;
          } else {
              low = 0;
              high = (high + 1) | 0;
          }
      }

      if (val >= 0x10000000000000000 || val < -0x10000000000000000) {
          throw new Error('Given varint doesn\'t fit into 10 bytes');
      }

      pbf.realloc(10);

      writeBigVarintLow(low, high, pbf);
      writeBigVarintHigh(high, pbf);
  }

  function writeBigVarintLow(low, high, pbf) {
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
      pbf.buf[pbf.pos]   = low & 0x7f;
  }

  function writeBigVarintHigh(high, pbf) {
      var lsb = (high & 0x07) << 4;

      pbf.buf[pbf.pos++] |= lsb         | ((high >>>= 3) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
      pbf.buf[pbf.pos++]  = high & 0x7f;
  }

  function makeRoomForExtraLength(startPos, len, pbf) {
      var extraLen =
          len <= 0x3fff ? 1 :
          len <= 0x1fffff ? 2 :
          len <= 0xfffffff ? 3 : Math.floor(Math.log(len) / (Math.LN2 * 7));

      // if 1 byte isn't enough for encoding message length, shift the data to the right
      pbf.realloc(extraLen);
      for (var i = pbf.pos - 1; i >= startPos; i--) pbf.buf[i + extraLen] = pbf.buf[i];
  }

  function writePackedVarint(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeVarint(arr[i]);   }
  function writePackedSVarint(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeSVarint(arr[i]);  }
  function writePackedFloat(arr, pbf)    { for (var i = 0; i < arr.length; i++) pbf.writeFloat(arr[i]);    }
  function writePackedDouble(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeDouble(arr[i]);   }
  function writePackedBoolean(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeBoolean(arr[i]);  }
  function writePackedFixed32(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed32(arr[i]);  }
  function writePackedSFixed32(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed32(arr[i]); }
  function writePackedFixed64(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed64(arr[i]);  }
  function writePackedSFixed64(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed64(arr[i]); }

  // Buffer code below from https://github.com/feross/buffer, MIT-licensed

  function readUInt32(buf, pos) {
      return ((buf[pos]) |
          (buf[pos + 1] << 8) |
          (buf[pos + 2] << 16)) +
          (buf[pos + 3] * 0x1000000);
  }

  function writeInt32(buf, val, pos) {
      buf[pos] = val;
      buf[pos + 1] = (val >>> 8);
      buf[pos + 2] = (val >>> 16);
      buf[pos + 3] = (val >>> 24);
  }

  function readInt32(buf, pos) {
      return ((buf[pos]) |
          (buf[pos + 1] << 8) |
          (buf[pos + 2] << 16)) +
          (buf[pos + 3] << 24);
  }

  function readUtf8(buf, pos, end) {
      var str = '';
      var i = pos;

      while (i < end) {
          var b0 = buf[i];
          var c = null; // codepoint
          var bytesPerSequence =
              b0 > 0xEF ? 4 :
              b0 > 0xDF ? 3 :
              b0 > 0xBF ? 2 : 1;

          if (i + bytesPerSequence > end) break;

          var b1, b2, b3;

          if (bytesPerSequence === 1) {
              if (b0 < 0x80) {
                  c = b0;
              }
          } else if (bytesPerSequence === 2) {
              b1 = buf[i + 1];
              if ((b1 & 0xC0) === 0x80) {
                  c = (b0 & 0x1F) << 0x6 | (b1 & 0x3F);
                  if (c <= 0x7F) {
                      c = null;
                  }
              }
          } else if (bytesPerSequence === 3) {
              b1 = buf[i + 1];
              b2 = buf[i + 2];
              if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
                  c = (b0 & 0xF) << 0xC | (b1 & 0x3F) << 0x6 | (b2 & 0x3F);
                  if (c <= 0x7FF || (c >= 0xD800 && c <= 0xDFFF)) {
                      c = null;
                  }
              }
          } else if (bytesPerSequence === 4) {
              b1 = buf[i + 1];
              b2 = buf[i + 2];
              b3 = buf[i + 3];
              if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
                  c = (b0 & 0xF) << 0x12 | (b1 & 0x3F) << 0xC | (b2 & 0x3F) << 0x6 | (b3 & 0x3F);
                  if (c <= 0xFFFF || c >= 0x110000) {
                      c = null;
                  }
              }
          }

          if (c === null) {
              c = 0xFFFD;
              bytesPerSequence = 1;

          } else if (c > 0xFFFF) {
              c -= 0x10000;
              str += String.fromCharCode(c >>> 10 & 0x3FF | 0xD800);
              c = 0xDC00 | c & 0x3FF;
          }

          str += String.fromCharCode(c);
          i += bytesPerSequence;
      }

      return str;
  }

  function readUtf8TextDecoder(buf, pos, end) {
      return utf8TextDecoder.decode(buf.subarray(pos, end));
  }

  function writeUtf8(buf, str, pos) {
      for (var i = 0, c, lead; i < str.length; i++) {
          c = str.charCodeAt(i); // code point

          if (c > 0xD7FF && c < 0xE000) {
              if (lead) {
                  if (c < 0xDC00) {
                      buf[pos++] = 0xEF;
                      buf[pos++] = 0xBF;
                      buf[pos++] = 0xBD;
                      lead = c;
                      continue;
                  } else {
                      c = lead - 0xD800 << 10 | c - 0xDC00 | 0x10000;
                      lead = null;
                  }
              } else {
                  if (c > 0xDBFF || (i + 1 === str.length)) {
                      buf[pos++] = 0xEF;
                      buf[pos++] = 0xBF;
                      buf[pos++] = 0xBD;
                  } else {
                      lead = c;
                  }
                  continue;
              }
          } else if (lead) {
              buf[pos++] = 0xEF;
              buf[pos++] = 0xBF;
              buf[pos++] = 0xBD;
              lead = null;
          }

          if (c < 0x80) {
              buf[pos++] = c;
          } else {
              if (c < 0x800) {
                  buf[pos++] = c >> 0x6 | 0xC0;
              } else {
                  if (c < 0x10000) {
                      buf[pos++] = c >> 0xC | 0xE0;
                  } else {
                      buf[pos++] = c >> 0x12 | 0xF0;
                      buf[pos++] = c >> 0xC & 0x3F | 0x80;
                  }
                  buf[pos++] = c >> 0x6 & 0x3F | 0x80;
              }
              buf[pos++] = c & 0x3F | 0x80;
          }
      }
      return pos;
  }

  // unknown_msg ========================================

  const unknown_msg = {};

  unknown_msg.read = function (pbf, end) {
      return pbf.readFields(unknown_msg._readField, {mt: 0}, end);
  };
  unknown_msg._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
  };
  unknown_msg.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
  };

  // iomdata ========================================

  const iomdata = {};

  iomdata.read = function (pbf, end) {
      return pbf.readFields(iomdata._readField, {mt: 0, total_d_inputs: 0, total_d_outputs: 0, total_a_inputs: 0, total_a_outputs: 0, d_inputs: null, d_outputs: null, a_inputs: null, a_outputs: null}, end);
  };
  iomdata._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
      else if (tag === 2) obj.total_d_inputs = pbf.readVarint();
      else if (tag === 3) obj.total_d_outputs = pbf.readVarint();
      else if (tag === 4) obj.total_a_inputs = pbf.readVarint();
      else if (tag === 5) obj.total_a_outputs = pbf.readVarint();
      else if (tag === 6) obj.d_inputs = pbf.readBytes();
      else if (tag === 7) obj.d_outputs = pbf.readBytes();
      else if (tag === 8) obj.a_inputs = pbf.readBytes();
      else if (tag === 9) obj.a_outputs = pbf.readBytes();
  };
  iomdata.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
      if (obj.total_d_inputs) pbf.writeVarintField(2, obj.total_d_inputs);
      if (obj.total_d_outputs) pbf.writeVarintField(3, obj.total_d_outputs);
      if (obj.total_a_inputs) pbf.writeVarintField(4, obj.total_a_inputs);
      if (obj.total_a_outputs) pbf.writeVarintField(5, obj.total_a_outputs);
      if (obj.d_inputs) pbf.writeBytesField(6, obj.d_inputs);
      if (obj.d_outputs) pbf.writeBytesField(7, obj.d_outputs);
      if (obj.a_inputs) pbf.writeBytesField(8, obj.a_inputs);
      if (obj.a_outputs) pbf.writeBytesField(9, obj.a_outputs);
  };

  // minmax ========================================

  const minmax = {};

  minmax.read = function (pbf, end) {
      return pbf.readFields(minmax._readField, {mt: 0, min_zone: 0, max_zone: 0, min: 0, max: 0}, end);
  };
  minmax._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
      else if (tag === 2) obj.min_zone = pbf.readVarint();
      else if (tag === 3) obj.max_zone = pbf.readVarint();
      else if (tag === 4) obj.min = pbf.readVarint(true);
      else if (tag === 5) obj.max = pbf.readVarint(true);
  };
  minmax.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
      if (obj.min_zone) pbf.writeVarintField(2, obj.min_zone);
      if (obj.max_zone) pbf.writeVarintField(3, obj.max_zone);
      if (obj.min) pbf.writeVarintField(4, obj.min);
      if (obj.max) pbf.writeVarintField(5, obj.max);
  };

  // sysinfo ========================================

  const sysinfo = {};

  sysinfo.read = function (pbf, end) {
      return pbf.readFields(sysinfo._readField, {mt: 0, state: 0, order_status: 0, order_id: 0, target: 0, inj_cycle: 0, cycle_id: 0, good_parts: 0, text_message: "", msg: null, dmsg: null}, end);
  };
  sysinfo._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
      else if (tag === 2) obj.state = pbf.readVarint();
      else if (tag === 4) obj.order_status = pbf.readVarint();
      else if (tag === 5) obj.order_id = pbf.readVarint(true);
      else if (tag === 6) obj.target = pbf.readVarint(true);
      else if (tag === 7) obj.inj_cycle = pbf.readVarint(true);
      else if (tag === 8) obj.cycle_id = pbf.readVarint(true);
      else if (tag === 9) obj.good_parts = pbf.readVarint(true);
      else if (tag === 3) obj.text_message = pbf.readString(), obj.msg = "text_message";
      else if (tag === 10) obj.dmsg = dbmsg.read(pbf, pbf.readVarint() + pbf.pos), obj.msg = "dmsg";
  };
  sysinfo.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
      if (obj.state) pbf.writeVarintField(2, obj.state);
      if (obj.order_status) pbf.writeVarintField(4, obj.order_status);
      if (obj.order_id) pbf.writeVarintField(5, obj.order_id);
      if (obj.target) pbf.writeVarintField(6, obj.target);
      if (obj.inj_cycle) pbf.writeVarintField(7, obj.inj_cycle);
      if (obj.cycle_id) pbf.writeVarintField(8, obj.cycle_id);
      if (obj.good_parts) pbf.writeVarintField(9, obj.good_parts);
      if (obj.text_message) pbf.writeStringField(3, obj.text_message);
      if (obj.dmsg) pbf.writeMessage(10, dbmsg.write, obj.dmsg);
  };

  // dbmsg ========================================

  const dbmsg = {};

  dbmsg.read = function (pbf, end) {
      return pbf.readFields(dbmsg._readField, {dbid: 0, parameters: ""}, end);
  };
  dbmsg._readField = function (tag, obj, pbf) {
      if (tag === 100) obj.dbid = pbf.readVarint(true);
      else if (tag === 101) obj.parameters = pbf.readString();
  };
  dbmsg.write = function (obj, pbf) {
      if (obj.dbid) pbf.writeVarintField(100, obj.dbid);
      if (obj.parameters) pbf.writeStringField(101, obj.parameters);
  };

  // mdtmsg ========================================

  const mdtmsg = {};

  mdtmsg.read = function (pbf, end) {
      return pbf.readFields(mdtmsg._readField, {mt: 0, progress: 0, dbid: 0, parameters: ""}, end);
  };
  mdtmsg._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
      else if (tag === 2) obj.progress = pbf.readVarint(true);
      else if (tag === 100) obj.dbid = pbf.readVarint(true);
      else if (tag === 101) obj.parameters = pbf.readString();
  };
  mdtmsg.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
      if (obj.progress) pbf.writeVarintField(2, obj.progress);
      if (obj.dbid) pbf.writeVarintField(100, obj.dbid);
      if (obj.parameters) pbf.writeStringField(101, obj.parameters);
  };

  // tcdata ========================================

  const tcdata = {};

  tcdata.read = function (pbf, end) {
      return pbf.readFields(tcdata._readField, {mt: 0, slice_id: 0, zones: 0, records: []}, end);
  };
  tcdata._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
      else if (tag === 2) obj.slice_id = pbf.readVarint();
      else if (tag === 3) obj.zones = pbf.readVarint();
      else if (tag === 4) pbf.readPackedVarint(obj.records, true);
  };
  tcdata.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
      if (obj.slice_id) pbf.writeVarintField(2, obj.slice_id);
      if (obj.zones) pbf.writeVarintField(3, obj.zones);
      if (obj.records) pbf.writePackedVarint(4, obj.records);
  };

  // vgcdata ========================================

  const vgcdata = {};

  vgcdata.read = function (pbf, end) {
      return pbf.readFields(vgcdata._readField, {mt: 0, slice_id: 0, zones: 0, records: []}, end);
  };
  vgcdata._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
      else if (tag === 2) obj.slice_id = pbf.readVarint();
      else if (tag === 3) obj.zones = pbf.readVarint();
      else if (tag === 4) pbf.readPackedVarint(obj.records, true);
  };
  vgcdata.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
      if (obj.slice_id) pbf.writeVarintField(2, obj.slice_id);
      if (obj.zones) pbf.writeVarintField(3, obj.zones);
      if (obj.records) pbf.writePackedVarint(4, obj.records);
  };

  // tczone_record ========================================

  const tczone_record = {};

  tczone_record.read = function (pbf, end) {
      return pbf.readFields(tczone_record._readField, {temp_sp: 0, manual_sp: 0, actual_temp: 0, actual_percent: 0, actual_current: 0, settings: 0, temperature_alarm: 0, power_alarm: 0}, end);
  };
  tczone_record._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.temp_sp = pbf.readVarint();
      else if (tag === 2) obj.manual_sp = pbf.readVarint();
      else if (tag === 3) obj.actual_temp = pbf.readVarint();
      else if (tag === 4) obj.actual_percent = pbf.readVarint();
      else if (tag === 5) obj.actual_current = pbf.readVarint();
      else if (tag === 6) obj.settings = pbf.readVarint();
      else if (tag === 7) obj.temperature_alarm = pbf.readVarint();
      else if (tag === 8) obj.power_alarm = pbf.readVarint();
  };
  tczone_record.write = function (obj, pbf) {
      if (obj.temp_sp) pbf.writeVarintField(1, obj.temp_sp);
      if (obj.manual_sp) pbf.writeVarintField(2, obj.manual_sp);
      if (obj.actual_temp) pbf.writeVarintField(3, obj.actual_temp);
      if (obj.actual_percent) pbf.writeVarintField(4, obj.actual_percent);
      if (obj.actual_current) pbf.writeVarintField(5, obj.actual_current);
      if (obj.settings) pbf.writeVarintField(6, obj.settings);
      if (obj.temperature_alarm) pbf.writeVarintField(7, obj.temperature_alarm);
      if (obj.power_alarm) pbf.writeVarintField(8, obj.power_alarm);
  };

  // tczone ========================================

  const tczone = {};

  tczone.read = function (pbf, end) {
      return pbf.readFields(tczone._readField, {mt: 0, zones: 0, records: []}, end);
  };
  tczone._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
      else if (tag === 2) obj.zones = pbf.readVarint();
      else if (tag === 3) obj.records.push(tczone_record.read(pbf, pbf.readVarint() + pbf.pos));
  };
  tczone.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
      if (obj.zones) pbf.writeVarintField(2, obj.zones);
      if (obj.records) for (var i = 0; i < obj.records.length; i++) pbf.writeMessage(3, tczone_record.write, obj.records[i]);
  };

  // healthstatus ========================================

  const healthstatus = {};

  healthstatus.read = function (pbf, end) {
      return pbf.readFields(healthstatus._readField, {mt: 0, status: []}, end);
  };
  healthstatus._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.mt = pbf.readVarint();
      else if (tag === 2) obj.status.push(healthstatus.ProcessStatus.read(pbf, pbf.readVarint() + pbf.pos));
  };
  healthstatus.write = function (obj, pbf) {
      if (obj.mt) pbf.writeVarintField(1, obj.mt);
      if (obj.status) for (var i = 0; i < obj.status.length; i++) pbf.writeMessage(2, healthstatus.ProcessStatus.write, obj.status[i]);
  };

  // healthstatus.ProcessStatus ========================================

  healthstatus.ProcessStatus = {};

  healthstatus.ProcessStatus.read = function (pbf, end) {
      return pbf.readFields(healthstatus.ProcessStatus._readField, {status: 0, secs: 0}, end);
  };
  healthstatus.ProcessStatus._readField = function (tag, obj, pbf) {
      if (tag === 1) obj.status = pbf.readVarint(true);
      else if (tag === 2) obj.secs = pbf.readVarint(true);
  };
  healthstatus.ProcessStatus.write = function (obj, pbf) {
      if (obj.status) pbf.writeVarintField(1, obj.status);
      if (obj.secs) pbf.writeVarintField(2, obj.secs);
  };

  const maxChunkSize = 100;

  let params = {
    rate: 10
  };

  let buffer = [];


  // ensure buffer is never filled faster than the specified rate
  const tryPush = (frame) => {
    frame.ts = frame.time.getTime();
    const lastFrame = buffer[buffer.length - 1];
    if(!lastFrame) {
      buffer.push(frame);
      return
    }
    // min interval is min ms between frames with 5ms padding
    const minIntvl = 1000 / params.rate + 5;
    if(frame.time - lastFrame.time >= minIntvl) {
      buffer.push(frame);
    }
  };

  var dataBuffer = buffer;

  buffer.write = function ({ ts, data }) {

    // simulate 450 zones
    // data = data.concat(data).concat(data)

    const date = new Date(ts);
    const frame = { data, date, time: ts };

    tryPush(frame);
    // tween(frame, 12)

    buffer = buffer.slice(-7500);
  };


  let intervals = {};
  let latest = {};
  let earliest = {};
  let needsReset = {};

  const bufferCommands = (port, e, id) => {
    const { data } = e;

    const post = (data) => {
      if(port) {
        port.postMessage(data);
      }
    };

    if (data.command == 'readBuffer') {

      // send data in batches, limiting max to avoid OOM when serializing to
      // pass between threads
      const sendChunk = () => {
        const resetBuffer = () => {
          latest[id] = buffer[buffer.length - 1] && buffer[buffer.length - 1].ts;
          earliest[id] = latest[id] + 1;
          needsReset[id] = false;
        };
        if (!latest[id] && buffer.length) {
          resetBuffer();
        }

        if(needsReset[id]) {
          post('reset');
          resetBuffer();
          return
        }

        if(latest[id]) {
          const newest = buffer.filter(x => x.ts > latest[id]);
          const backFill = buffer.filter(x => x.ts < earliest[id]).slice(-(maxChunkSize - newest.length));
          const update = backFill.concat(newest);
          if (update.length) {
            const latestEntry = update[update.length - 1];
            const firstEntry = update[0];
            latest[id] = latestEntry.time;
            if(firstEntry.time < earliest[id]) earliest[id] = firstEntry.time;
            post({ update, params });
          }
        }
        // console.log(sizeOf([ ...buffer ]))
      };

      intervals[id] = setInterval(sendChunk, 200);
    }

    if (data.command == 'setBufferParams') {
      let reset = false;
      for(let key of Object.keys(data.params)) {
        if(data.params[key] != params[key]) {
          reset = true;
        }
      }
      params = { ...params, ...data.params || {}};
      if(reset) {
        buffer = buffer.slice(0, 0);
        for (let key of Object.keys(needsReset)) {
          needsReset[key] = true;
        }
      }
    }

    if (data.command == 'close') {
      clearInterval(intervals[id]);
      latest[id] = 0;
    }
  };

  const messageTypes = { tcdata, minmax, unknown_msg, tczone, sysinfo, mdtmsg, healthstatus };

  let socket;
  let ports = [];

  let connectedChannels = [];
  let activeChannels = [];

  const updateActive = async () => {
    activeChannels = [];
    for(let p of ports) {
      activeChannels = activeChannels.concat(p.subscriptions);
    }
    activeChannels = [ ... new Set(activeChannels) ];
    for(let c of connectedChannels) {
      if(!activeChannels.includes(c)) {
        await send(`-${c}`);
      }
    }
    await connect();
  };

  const getPortData = port => {
    const p = ports.find(x => x.port == port);
    return p ? p.data : {}
  };

  const setPortData = (port, data) => {
    const p = ports.find(x => x.port == port);
    if(!p) {
      ports.push({ ...data, port });
    } else {
      ports = ports.map(x => {
        if(x.port == port) {
          return { ...x, ...data, port }
        }
        return x
      });
    }
  };

  const addPortSubscriptions = (port, subscriptions) => {
    const current = (getPortData(port) || {}).subscriptions || [];
    setPortData(port, {
      subscriptions: [ ... new Set(current.concat(subscriptions)) ]
    });
    updateActive();
  };


  let ready = false;
  let socketTarget;
  let queue = [];

  const initiate = async () => {
    ready = true;
    for(let fn of queue) {
      fn();
    }
    connect();
  };

  (function () {
    File.prototype.arrayBuffer = File.prototype.arrayBuffer || myArrayBuffer;
    Blob.prototype.arrayBuffer = Blob.prototype.arrayBuffer || myArrayBuffer;

    function myArrayBuffer() {
      // this: File or Blob
      return new Promise((resolve) => {
        let fr = new FileReader();
        fr.onload = () => {
          resolve(fr.result);
        };
        fr.readAsArrayBuffer(this);
      })
    }
  })();


  const createSocket = () => new Promise((resolve, reject) => {
    if(ready) resolve();
    if(!socket) {
      socket = new WebSocket(socketTarget);

      socket.addEventListener('open', e => {
        console.log('Socket connection established');
        postMessage('connected');
        initiate();
        // connect()
      });

      socket.addEventListener('message', async e => {
        // console.log(e)
        const ts = new Date();

        const blob = e.data;
        // console.log(e.data)
        const buffer = await blob.arrayBuffer();
        const pbf$1 = new pbf(buffer);

        const { mt } = unknown_msg.read(pbf$1);
        const decoders = {
          2: 'minmax',
          3: 'sysinfo',
          4: 'tcdata',
          6: 'tczone',
          7: 'mdtmsg',
          8: 'healthstatus'
        };
        const type = decoders[mt];

        const data = messageTypes[type].read(new pbf(buffer));

        // DEPRECATED: no Uint8Arrays currently being passed

        // for(let key of Object.keys(data)) {
        //   if(data[key] && data[key].constructor === Uint8Array) {
        //     data[key] = getString(data[key])
        //   }
        // }

        // ports[0].port.postMessage(data)

        if(mt == 6) {
          dataBuffer.write({ ts, data: data.records });
        }

        for(let { port, subscriptions } of ports) {
          if(subscriptions.includes(type)) {
            if(port) {
              port.postMessage({ ts, data });
            } else {
              postMessage({ ts, data });
            }

          }
        }
        // postMessage(data)
      });

      socket.addEventListener('close', e => {
        console.log('Socket connection broken! Retrying in 1s...');
        postMessage('disconnected');
        ready = false;
        socket = null;
        connectedChannels = [];
        setTimeout(() => {
          createSocket();
        }, 1000);
      });
    }
    queue.push(resolve);
  });

  const send = async msg => {
    await createSocket();
    console.log(`sending ${msg}`);
    socket.send(msg);
  };

  const connect = async () => {
    let toConnect = activeChannels.filter(x => !connectedChannels.includes(x));
    connectedChannels = [ ...activeChannels ];
    for(let channel of toConnect) {
      await send(`+${channel}`);
    }
  };


  // DEPRECATED: no Uint8Arrays currently being passed

  // function getString(array) {
  //   var out, i, len, c
  //   var char2, char3

  //   out = ""
  //   len = array.length
  //   i = 0
  //   while (i < len) {
  //     c = array[i++]
  //     if (i > 0 && c === 0) break
  //     switch (c >> 4) {
  //     case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
  //       // 0xxxxxxx
  //       out += String.fromCharCode(c)
  //       break
  //     case 12: case 13:
  //       // 110x xxxx   10xx xxxx
  //       char2 = array[i++]
  //       out += String.fromCharCode((c & 0x1F) << 6 | char2 & 0x3F)
  //       break
  //     case 14:
  //       // 1110 xxxx  10xx xxxx  10xx xxxx
  //       char2 = array[i++]
  //       char3 = array[i++]
  //       out += String.fromCharCode((c & 0x0F) << 12 |
  //           (char2 & 0x3F) << 6 |
  //           (char3 & 0x3F) << 0)
  //       break
  //     }
  //   }

  //   return out
  // }


  const id = () => {
    return '_' + Math.random().toString(36).substr(2, 9)
  };



  const processCommand = e => {
    const { data } = e;
    if (data.command == 'start') {
      socketTarget = data.target;
    }

    if (data.command == 'connect') {
      addPortSubscriptions(data.port, data.channels);
    }

    if (data.command == 'close') {
      if (data.port) {
        ports = ports.filter(x => x.port != port);
      }
    }
  };

  onmessage = e => {
    const { data } = e;
    if(data.port) {
      const port = data.port;
      const connectionId = id();
      port.onmessage = function(e) {
        processCommand(e);
        bufferCommands(port, e, connectionId);
      };
    } else {
      processCommand(e);
      bufferCommands(null, e, 'main');
    }
  };

  // onconnect = function(e) {

  //   const connectionId = id()

  //   const port = e.ports[0]

  //   port.onmessage = async e => {
  //     console.log(e.data)
  //     const { data } = e

  //     if(data.command == 'start') {
  //       socketTarget = data.target
  //     }

  //     if(data.command == 'connect') {
  //       addPortSubscriptions(port, data.channels)
  //     }

  //     if(data.command == 'close') {
  //       ports = ports.filter(x => x.port != port)
  //     }

  //     bufferCommands(port, e, connectionId)
  //   }
  // }

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3Mtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wYmYvaW5kZXguanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS9kZWNvZGUucHJvdG8uanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS93cy13b3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohIGllZWU3NTQuIEJTRC0zLUNsYXVzZSBMaWNlbnNlLiBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmcvb3BlbnNvdXJjZT4gKi9cbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gKGUgKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gKG0gKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAoKHZhbHVlICogYykgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBQYmY7XG5cbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpO1xuXG5mdW5jdGlvbiBQYmYoYnVmKSB7XG4gICAgdGhpcy5idWYgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgJiYgQXJyYXlCdWZmZXIuaXNWaWV3KGJ1ZikgPyBidWYgOiBuZXcgVWludDhBcnJheShidWYgfHwgMCk7XG4gICAgdGhpcy5wb3MgPSAwO1xuICAgIHRoaXMudHlwZSA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLmJ1Zi5sZW5ndGg7XG59XG5cblBiZi5WYXJpbnQgID0gMDsgLy8gdmFyaW50OiBpbnQzMiwgaW50NjQsIHVpbnQzMiwgdWludDY0LCBzaW50MzIsIHNpbnQ2NCwgYm9vbCwgZW51bVxuUGJmLkZpeGVkNjQgPSAxOyAvLyA2NC1iaXQ6IGRvdWJsZSwgZml4ZWQ2NCwgc2ZpeGVkNjRcblBiZi5CeXRlcyAgID0gMjsgLy8gbGVuZ3RoLWRlbGltaXRlZDogc3RyaW5nLCBieXRlcywgZW1iZWRkZWQgbWVzc2FnZXMsIHBhY2tlZCByZXBlYXRlZCBmaWVsZHNcblBiZi5GaXhlZDMyID0gNTsgLy8gMzItYml0OiBmbG9hdCwgZml4ZWQzMiwgc2ZpeGVkMzJcblxudmFyIFNISUZUX0xFRlRfMzIgPSAoMSA8PCAxNikgKiAoMSA8PCAxNiksXG4gICAgU0hJRlRfUklHSFRfMzIgPSAxIC8gU0hJRlRfTEVGVF8zMjtcblxuLy8gVGhyZXNob2xkIGNob3NlbiBiYXNlZCBvbiBib3RoIGJlbmNobWFya2luZyBhbmQga25vd2xlZGdlIGFib3V0IGJyb3dzZXIgc3RyaW5nXG4vLyBkYXRhIHN0cnVjdHVyZXMgKHdoaWNoIGN1cnJlbnRseSBzd2l0Y2ggc3RydWN0dXJlIHR5cGVzIGF0IDEyIGJ5dGVzIG9yIG1vcmUpXG52YXIgVEVYVF9ERUNPREVSX01JTl9MRU5HVEggPSAxMjtcbnZhciB1dGY4VGV4dERlY29kZXIgPSB0eXBlb2YgVGV4dERlY29kZXIgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IG5ldyBUZXh0RGVjb2RlcigndXRmOCcpO1xuXG5QYmYucHJvdG90eXBlID0ge1xuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuYnVmID0gbnVsbDtcbiAgICB9LFxuXG4gICAgLy8gPT09IFJFQURJTkcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIHJlYWRGaWVsZHM6IGZ1bmN0aW9uKHJlYWRGaWVsZCwgcmVzdWx0LCBlbmQpIHtcbiAgICAgICAgZW5kID0gZW5kIHx8IHRoaXMubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgdmFyIHZhbCA9IHRoaXMucmVhZFZhcmludCgpLFxuICAgICAgICAgICAgICAgIHRhZyA9IHZhbCA+PiAzLFxuICAgICAgICAgICAgICAgIHN0YXJ0UG9zID0gdGhpcy5wb3M7XG5cbiAgICAgICAgICAgIHRoaXMudHlwZSA9IHZhbCAmIDB4NztcbiAgICAgICAgICAgIHJlYWRGaWVsZCh0YWcsIHJlc3VsdCwgdGhpcyk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA9PT0gc3RhcnRQb3MpIHRoaXMuc2tpcCh2YWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIHJlYWRNZXNzYWdlOiBmdW5jdGlvbihyZWFkRmllbGQsIHJlc3VsdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkRmllbGRzKHJlYWRGaWVsZCwgcmVzdWx0LCB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zKTtcbiAgICB9LFxuXG4gICAgcmVhZEZpeGVkMzI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gcmVhZFVJbnQzMih0aGlzLmJ1ZiwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkU0ZpeGVkMzI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gcmVhZEludDMyKHRoaXMuYnVmLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIC8vIDY0LWJpdCBpbnQgaGFuZGxpbmcgaXMgYmFzZWQgb24gZ2l0aHViLmNvbS9kcHcvbm9kZS1idWZmZXItbW9yZS1pbnRzIChNSVQtbGljZW5zZWQpXG5cbiAgICByZWFkRml4ZWQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSByZWFkVUludDMyKHRoaXMuYnVmLCB0aGlzLnBvcykgKyByZWFkVUludDMyKHRoaXMuYnVmLCB0aGlzLnBvcyArIDQpICogU0hJRlRfTEVGVF8zMjtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9LFxuXG4gICAgcmVhZFNGaXhlZDY0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbCA9IHJlYWRVSW50MzIodGhpcy5idWYsIHRoaXMucG9zKSArIHJlYWRJbnQzMih0aGlzLmJ1ZiwgdGhpcy5wb3MgKyA0KSAqIFNISUZUX0xFRlRfMzI7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWRGbG9hdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSBpZWVlNzU0LnJlYWQodGhpcy5idWYsIHRoaXMucG9zLCB0cnVlLCAyMywgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWREb3VibGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gaWVlZTc1NC5yZWFkKHRoaXMuYnVmLCB0aGlzLnBvcywgdHJ1ZSwgNTIsIDgpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkVmFyaW50OiBmdW5jdGlvbihpc1NpZ25lZCkge1xuICAgICAgICB2YXIgYnVmID0gdGhpcy5idWYsXG4gICAgICAgICAgICB2YWwsIGI7XG5cbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICA9ICBiICYgMHg3ZjsgICAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgNzsgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgMTQ7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgMjE7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvc107ICAgdmFsIHw9IChiICYgMHgwZikgPDwgMjg7XG5cbiAgICAgICAgcmV0dXJuIHJlYWRWYXJpbnRSZW1haW5kZXIodmFsLCBpc1NpZ25lZCwgdGhpcyk7XG4gICAgfSxcblxuICAgIHJlYWRWYXJpbnQ2NDogZnVuY3Rpb24oKSB7IC8vIGZvciBjb21wYXRpYmlsaXR5IHdpdGggdjIuMC4xXG4gICAgICAgIHJldHVybiB0aGlzLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgfSxcblxuICAgIHJlYWRTVmFyaW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG51bSA9IHRoaXMucmVhZFZhcmludCgpO1xuICAgICAgICByZXR1cm4gbnVtICUgMiA9PT0gMSA/IChudW0gKyAxKSAvIC0yIDogbnVtIC8gMjsgLy8gemlnemFnIGVuY29kaW5nXG4gICAgfSxcblxuICAgIHJlYWRCb29sZWFuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4odGhpcy5yZWFkVmFyaW50KCkpO1xuICAgIH0sXG5cbiAgICByZWFkU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3M7XG4gICAgICAgIHZhciBwb3MgPSB0aGlzLnBvcztcbiAgICAgICAgdGhpcy5wb3MgPSBlbmQ7XG5cbiAgICAgICAgaWYgKGVuZCAtIHBvcyA+PSBURVhUX0RFQ09ERVJfTUlOX0xFTkdUSCAmJiB1dGY4VGV4dERlY29kZXIpIHtcbiAgICAgICAgICAgIC8vIGxvbmdlciBzdHJpbmdzIGFyZSBmYXN0IHdpdGggdGhlIGJ1aWx0LWluIGJyb3dzZXIgVGV4dERlY29kZXIgQVBJXG4gICAgICAgICAgICByZXR1cm4gcmVhZFV0ZjhUZXh0RGVjb2Rlcih0aGlzLmJ1ZiwgcG9zLCBlbmQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNob3J0IHN0cmluZ3MgYXJlIGZhc3Qgd2l0aCBvdXIgY3VzdG9tIGltcGxlbWVudGF0aW9uXG4gICAgICAgIHJldHVybiByZWFkVXRmOCh0aGlzLmJ1ZiwgcG9zLCBlbmQpO1xuICAgIH0sXG5cbiAgICByZWFkQnl0ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcyxcbiAgICAgICAgICAgIGJ1ZmZlciA9IHRoaXMuYnVmLnN1YmFycmF5KHRoaXMucG9zLCBlbmQpO1xuICAgICAgICB0aGlzLnBvcyA9IGVuZDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9LFxuXG4gICAgLy8gdmVyYm9zZSBmb3IgcGVyZm9ybWFuY2UgcmVhc29uczsgZG9lc24ndCBhZmZlY3QgZ3ppcHBlZCBzaXplXG5cbiAgICByZWFkUGFja2VkVmFyaW50OiBmdW5jdGlvbihhcnIsIGlzU2lnbmVkKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZFZhcmludChpc1NpZ25lZCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFZhcmludChpc1NpZ25lZCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZFNWYXJpbnQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRTVmFyaW50KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFNWYXJpbnQoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkQm9vbGVhbjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEJvb2xlYW4oKSk7XG4gICAgICAgIHZhciBlbmQgPSByZWFkUGFja2VkRW5kKHRoaXMpO1xuICAgICAgICBhcnIgPSBhcnIgfHwgW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkQm9vbGVhbigpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRGbG9hdDogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEZsb2F0KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEZsb2F0KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZERvdWJsZTogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZERvdWJsZSgpKTtcbiAgICAgICAgdmFyIGVuZCA9IHJlYWRQYWNrZWRFbmQodGhpcyk7XG4gICAgICAgIGFyciA9IGFyciB8fCBbXTtcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zIDwgZW5kKSBhcnIucHVzaCh0aGlzLnJlYWREb3VibGUoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRml4ZWQzMjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEZpeGVkMzIoKSk7XG4gICAgICAgIHZhciBlbmQgPSByZWFkUGFja2VkRW5kKHRoaXMpO1xuICAgICAgICBhcnIgPSBhcnIgfHwgW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkRml4ZWQzMigpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRTRml4ZWQzMjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZFNGaXhlZDMyKCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFNGaXhlZDMyKCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZEZpeGVkNjQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRGaXhlZDY0KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEZpeGVkNjQoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkU0ZpeGVkNjQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRTRml4ZWQ2NCgpKTtcbiAgICAgICAgdmFyIGVuZCA9IHJlYWRQYWNrZWRFbmQodGhpcyk7XG4gICAgICAgIGFyciA9IGFyciB8fCBbXTtcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zIDwgZW5kKSBhcnIucHVzaCh0aGlzLnJlYWRTRml4ZWQ2NCgpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuXG4gICAgc2tpcDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHZhciB0eXBlID0gdmFsICYgMHg3O1xuICAgICAgICBpZiAodHlwZSA9PT0gUGJmLlZhcmludCkgd2hpbGUgKHRoaXMuYnVmW3RoaXMucG9zKytdID4gMHg3Zikge31cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gUGJmLkJ5dGVzKSB0aGlzLnBvcyA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3M7XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFBiZi5GaXhlZDMyKSB0aGlzLnBvcyArPSA0O1xuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBQYmYuRml4ZWQ2NCkgdGhpcy5wb3MgKz0gODtcbiAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ1VuaW1wbGVtZW50ZWQgdHlwZTogJyArIHR5cGUpO1xuICAgIH0sXG5cbiAgICAvLyA9PT0gV1JJVElORyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgd3JpdGVUYWc6IGZ1bmN0aW9uKHRhZywgdHlwZSkge1xuICAgICAgICB0aGlzLndyaXRlVmFyaW50KCh0YWcgPDwgMykgfCB0eXBlKTtcbiAgICB9LFxuXG4gICAgcmVhbGxvYzogZnVuY3Rpb24obWluKSB7XG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAxNjtcblxuICAgICAgICB3aGlsZSAobGVuZ3RoIDwgdGhpcy5wb3MgKyBtaW4pIGxlbmd0aCAqPSAyO1xuXG4gICAgICAgIGlmIChsZW5ndGggIT09IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgIGJ1Zi5zZXQodGhpcy5idWYpO1xuICAgICAgICAgICAgdGhpcy5idWYgPSBidWY7XG4gICAgICAgICAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBmaW5pc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHRoaXMucG9zO1xuICAgICAgICB0aGlzLnBvcyA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1Zi5zdWJhcnJheSgwLCB0aGlzLmxlbmd0aCk7XG4gICAgfSxcblxuICAgIHdyaXRlRml4ZWQzMjogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg0KTtcbiAgICAgICAgd3JpdGVJbnQzMih0aGlzLmJ1ZiwgdmFsLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfSxcblxuICAgIHdyaXRlU0ZpeGVkMzI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLnJlYWxsb2MoNCk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIHZhbCwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH0sXG5cbiAgICB3cml0ZUZpeGVkNjQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLnJlYWxsb2MoOCk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIHZhbCAmIC0xLCB0aGlzLnBvcyk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIE1hdGguZmxvb3IodmFsICogU0hJRlRfUklHSFRfMzIpLCB0aGlzLnBvcyArIDQpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgIH0sXG5cbiAgICB3cml0ZVNGaXhlZDY0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDgpO1xuICAgICAgICB3cml0ZUludDMyKHRoaXMuYnVmLCB2YWwgJiAtMSwgdGhpcy5wb3MpO1xuICAgICAgICB3cml0ZUludDMyKHRoaXMuYnVmLCBNYXRoLmZsb29yKHZhbCAqIFNISUZUX1JJR0hUXzMyKSwgdGhpcy5wb3MgKyA0KTtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICB9LFxuXG4gICAgd3JpdGVWYXJpbnQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB2YWwgPSArdmFsIHx8IDA7XG5cbiAgICAgICAgaWYgKHZhbCA+IDB4ZmZmZmZmZiB8fCB2YWwgPCAwKSB7XG4gICAgICAgICAgICB3cml0ZUJpZ1ZhcmludCh2YWwsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuXG4gICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gICAgICAgICAgIHZhbCAmIDB4N2YgIHwgKHZhbCA+IDB4N2YgPyAweDgwIDogMCk7IGlmICh2YWwgPD0gMHg3ZikgcmV0dXJuO1xuICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+Pj0gNykgJiAweDdmKSB8ICh2YWwgPiAweDdmID8gMHg4MCA6IDApOyBpZiAodmFsIDw9IDB4N2YpIHJldHVybjtcbiAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj49IDcpICYgMHg3ZikgfCAodmFsID4gMHg3ZiA/IDB4ODAgOiAwKTsgaWYgKHZhbCA8PSAweDdmKSByZXR1cm47XG4gICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gICAodmFsID4+PiA3KSAmIDB4N2Y7XG4gICAgfSxcblxuICAgIHdyaXRlU1ZhcmludDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQodmFsIDwgMCA/IC12YWwgKiAyIC0gMSA6IHZhbCAqIDIpO1xuICAgIH0sXG5cbiAgICB3cml0ZUJvb2xlYW46IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVmFyaW50KEJvb2xlYW4odmFsKSk7XG4gICAgfSxcblxuICAgIHdyaXRlU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgc3RyID0gU3RyaW5nKHN0cik7XG4gICAgICAgIHRoaXMucmVhbGxvYyhzdHIubGVuZ3RoICogNCk7XG5cbiAgICAgICAgdGhpcy5wb3MrKzsgLy8gcmVzZXJ2ZSAxIGJ5dGUgZm9yIHNob3J0IHN0cmluZyBsZW5ndGhcblxuICAgICAgICB2YXIgc3RhcnRQb3MgPSB0aGlzLnBvcztcbiAgICAgICAgLy8gd3JpdGUgdGhlIHN0cmluZyBkaXJlY3RseSB0byB0aGUgYnVmZmVyIGFuZCBzZWUgaG93IG11Y2ggd2FzIHdyaXR0ZW5cbiAgICAgICAgdGhpcy5wb3MgPSB3cml0ZVV0ZjgodGhpcy5idWYsIHN0ciwgdGhpcy5wb3MpO1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5wb3MgLSBzdGFydFBvcztcblxuICAgICAgICBpZiAobGVuID49IDB4ODApIG1ha2VSb29tRm9yRXh0cmFMZW5ndGgoc3RhcnRQb3MsIGxlbiwgdGhpcyk7XG5cbiAgICAgICAgLy8gZmluYWxseSwgd3JpdGUgdGhlIG1lc3NhZ2UgbGVuZ3RoIGluIHRoZSByZXNlcnZlZCBwbGFjZSBhbmQgcmVzdG9yZSB0aGUgcG9zaXRpb25cbiAgICAgICAgdGhpcy5wb3MgPSBzdGFydFBvcyAtIDE7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQobGVuKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gbGVuO1xuICAgIH0sXG5cbiAgICB3cml0ZUZsb2F0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuICAgICAgICBpZWVlNzU0LndyaXRlKHRoaXMuYnVmLCB2YWwsIHRoaXMucG9zLCB0cnVlLCAyMywgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfSxcblxuICAgIHdyaXRlRG91YmxlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDgpO1xuICAgICAgICBpZWVlNzU0LndyaXRlKHRoaXMuYnVmLCB2YWwsIHRoaXMucG9zLCB0cnVlLCA1MiwgOCk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfSxcblxuICAgIHdyaXRlQnl0ZXM6IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICB2YXIgbGVuID0gYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChsZW4pO1xuICAgICAgICB0aGlzLnJlYWxsb2MobGVuKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgdGhpcy5idWZbdGhpcy5wb3MrK10gPSBidWZmZXJbaV07XG4gICAgfSxcblxuICAgIHdyaXRlUmF3TWVzc2FnZTogZnVuY3Rpb24oZm4sIG9iaikge1xuICAgICAgICB0aGlzLnBvcysrOyAvLyByZXNlcnZlIDEgYnl0ZSBmb3Igc2hvcnQgbWVzc2FnZSBsZW5ndGhcblxuICAgICAgICAvLyB3cml0ZSB0aGUgbWVzc2FnZSBkaXJlY3RseSB0byB0aGUgYnVmZmVyIGFuZCBzZWUgaG93IG11Y2ggd2FzIHdyaXR0ZW5cbiAgICAgICAgdmFyIHN0YXJ0UG9zID0gdGhpcy5wb3M7XG4gICAgICAgIGZuKG9iaiwgdGhpcyk7XG4gICAgICAgIHZhciBsZW4gPSB0aGlzLnBvcyAtIHN0YXJ0UG9zO1xuXG4gICAgICAgIGlmIChsZW4gPj0gMHg4MCkgbWFrZVJvb21Gb3JFeHRyYUxlbmd0aChzdGFydFBvcywgbGVuLCB0aGlzKTtcblxuICAgICAgICAvLyBmaW5hbGx5LCB3cml0ZSB0aGUgbWVzc2FnZSBsZW5ndGggaW4gdGhlIHJlc2VydmVkIHBsYWNlIGFuZCByZXN0b3JlIHRoZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0UG9zIC0gMTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChsZW4pO1xuICAgICAgICB0aGlzLnBvcyArPSBsZW47XG4gICAgfSxcblxuICAgIHdyaXRlTWVzc2FnZTogZnVuY3Rpb24odGFnLCBmbiwgb2JqKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlUmF3TWVzc2FnZShmbiwgb2JqKTtcbiAgICB9LFxuXG4gICAgd3JpdGVQYWNrZWRWYXJpbnQ6ICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRWYXJpbnQsIGFycik7ICAgfSxcbiAgICB3cml0ZVBhY2tlZFNWYXJpbnQ6ICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZFNWYXJpbnQsIGFycik7ICB9LFxuICAgIHdyaXRlUGFja2VkQm9vbGVhbjogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkQm9vbGVhbiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRGbG9hdDogICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRGbG9hdCwgYXJyKTsgICAgfSxcbiAgICB3cml0ZVBhY2tlZERvdWJsZTogICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZERvdWJsZSwgYXJyKTsgICB9LFxuICAgIHdyaXRlUGFja2VkRml4ZWQzMjogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkRml4ZWQzMiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRTRml4ZWQzMjogZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRTRml4ZWQzMiwgYXJyKTsgfSxcbiAgICB3cml0ZVBhY2tlZEZpeGVkNjQ6ICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZEZpeGVkNjQsIGFycik7ICB9LFxuICAgIHdyaXRlUGFja2VkU0ZpeGVkNjQ6IGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkU0ZpeGVkNjQsIGFycik7IH0sXG5cbiAgICB3cml0ZUJ5dGVzRmllbGQ6IGZ1bmN0aW9uKHRhZywgYnVmZmVyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlQnl0ZXMoYnVmZmVyKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQzMih2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkMzIodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQ2NCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkNjQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVNWYXJpbnQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlU3RyaW5nRmllbGQ6IGZ1bmN0aW9uKHRhZywgc3RyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlU3RyaW5nKHN0cik7XG4gICAgfSxcbiAgICB3cml0ZUZsb2F0RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuRml4ZWQzMik7XG4gICAgICAgIHRoaXMud3JpdGVGbG9hdCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVEb3VibGVGaWVsZDogZnVuY3Rpb24odGFnLCB2YWwpIHtcbiAgICAgICAgdGhpcy53cml0ZVRhZyh0YWcsIFBiZi5GaXhlZDY0KTtcbiAgICAgICAgdGhpcy53cml0ZURvdWJsZSh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVCb29sZWFuRmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnRGaWVsZCh0YWcsIEJvb2xlYW4odmFsKSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gcmVhZFZhcmludFJlbWFpbmRlcihsLCBzLCBwKSB7XG4gICAgdmFyIGJ1ZiA9IHAuYnVmLFxuICAgICAgICBoLCBiO1xuXG4gICAgYiA9IGJ1ZltwLnBvcysrXTsgaCAgPSAoYiAmIDB4NzApID4+IDQ7ICBpZiAoYiA8IDB4ODApIHJldHVybiB0b051bShsLCBoLCBzKTtcbiAgICBiID0gYnVmW3AucG9zKytdOyBoIHw9IChiICYgMHg3ZikgPDwgMzsgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHRvTnVtKGwsIGgsIHMpO1xuICAgIGIgPSBidWZbcC5wb3MrK107IGggfD0gKGIgJiAweDdmKSA8PCAxMDsgaWYgKGIgPCAweDgwKSByZXR1cm4gdG9OdW0obCwgaCwgcyk7XG4gICAgYiA9IGJ1ZltwLnBvcysrXTsgaCB8PSAoYiAmIDB4N2YpIDw8IDE3OyBpZiAoYiA8IDB4ODApIHJldHVybiB0b051bShsLCBoLCBzKTtcbiAgICBiID0gYnVmW3AucG9zKytdOyBoIHw9IChiICYgMHg3ZikgPDwgMjQ7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHRvTnVtKGwsIGgsIHMpO1xuICAgIGIgPSBidWZbcC5wb3MrK107IGggfD0gKGIgJiAweDAxKSA8PCAzMTsgaWYgKGIgPCAweDgwKSByZXR1cm4gdG9OdW0obCwgaCwgcyk7XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHZhcmludCBub3QgbW9yZSB0aGFuIDEwIGJ5dGVzJyk7XG59XG5cbmZ1bmN0aW9uIHJlYWRQYWNrZWRFbmQocGJmKSB7XG4gICAgcmV0dXJuIHBiZi50eXBlID09PSBQYmYuQnl0ZXMgP1xuICAgICAgICBwYmYucmVhZFZhcmludCgpICsgcGJmLnBvcyA6IHBiZi5wb3MgKyAxO1xufVxuXG5mdW5jdGlvbiB0b051bShsb3csIGhpZ2gsIGlzU2lnbmVkKSB7XG4gICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgIHJldHVybiBoaWdoICogMHgxMDAwMDAwMDAgKyAobG93ID4+PiAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKChoaWdoID4+PiAwKSAqIDB4MTAwMDAwMDAwKSArIChsb3cgPj4+IDApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJpZ1ZhcmludCh2YWwsIHBiZikge1xuICAgIHZhciBsb3csIGhpZ2g7XG5cbiAgICBpZiAodmFsID49IDApIHtcbiAgICAgICAgbG93ICA9ICh2YWwgJSAweDEwMDAwMDAwMCkgfCAwO1xuICAgICAgICBoaWdoID0gKHZhbCAvIDB4MTAwMDAwMDAwKSB8IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG93ICA9IH4oLXZhbCAlIDB4MTAwMDAwMDAwKTtcbiAgICAgICAgaGlnaCA9IH4oLXZhbCAvIDB4MTAwMDAwMDAwKTtcblxuICAgICAgICBpZiAobG93IF4gMHhmZmZmZmZmZikge1xuICAgICAgICAgICAgbG93ID0gKGxvdyArIDEpIHwgMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvdyA9IDA7XG4gICAgICAgICAgICBoaWdoID0gKGhpZ2ggKyAxKSB8IDA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFsID49IDB4MTAwMDAwMDAwMDAwMDAwMDAgfHwgdmFsIDwgLTB4MTAwMDAwMDAwMDAwMDAwMDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdHaXZlbiB2YXJpbnQgZG9lc25cXCd0IGZpdCBpbnRvIDEwIGJ5dGVzJyk7XG4gICAgfVxuXG4gICAgcGJmLnJlYWxsb2MoMTApO1xuXG4gICAgd3JpdGVCaWdWYXJpbnRMb3cobG93LCBoaWdoLCBwYmYpO1xuICAgIHdyaXRlQmlnVmFyaW50SGlnaChoaWdoLCBwYmYpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJpZ1ZhcmludExvdyhsb3csIGhpZ2gsIHBiZikge1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvc10gICA9IGxvdyAmIDB4N2Y7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmlnVmFyaW50SGlnaChoaWdoLCBwYmYpIHtcbiAgICB2YXIgbHNiID0gKGhpZ2ggJiAweDA3KSA8PCA0O1xuXG4gICAgcGJmLmJ1ZltwYmYucG9zKytdIHw9IGxzYiAgICAgICAgIHwgKChoaWdoID4+Pj0gMykgPyAweDgwIDogMCk7IGlmICghaGlnaCkgcmV0dXJuO1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSAgPSBoaWdoICYgMHg3ZiB8ICgoaGlnaCA+Pj49IDcpID8gMHg4MCA6IDApOyBpZiAoIWhpZ2gpIHJldHVybjtcbiAgICBwYmYuYnVmW3BiZi5wb3MrK10gID0gaGlnaCAmIDB4N2YgfCAoKGhpZ2ggPj4+PSA3KSA/IDB4ODAgOiAwKTsgaWYgKCFoaWdoKSByZXR1cm47XG4gICAgcGJmLmJ1ZltwYmYucG9zKytdICA9IGhpZ2ggJiAweDdmIHwgKChoaWdoID4+Pj0gNykgPyAweDgwIDogMCk7IGlmICghaGlnaCkgcmV0dXJuO1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSAgPSBoaWdoICYgMHg3ZiB8ICgoaGlnaCA+Pj49IDcpID8gMHg4MCA6IDApOyBpZiAoIWhpZ2gpIHJldHVybjtcbiAgICBwYmYuYnVmW3BiZi5wb3MrK10gID0gaGlnaCAmIDB4N2Y7XG59XG5cbmZ1bmN0aW9uIG1ha2VSb29tRm9yRXh0cmFMZW5ndGgoc3RhcnRQb3MsIGxlbiwgcGJmKSB7XG4gICAgdmFyIGV4dHJhTGVuID1cbiAgICAgICAgbGVuIDw9IDB4M2ZmZiA/IDEgOlxuICAgICAgICBsZW4gPD0gMHgxZmZmZmYgPyAyIDpcbiAgICAgICAgbGVuIDw9IDB4ZmZmZmZmZiA/IDMgOiBNYXRoLmZsb29yKE1hdGgubG9nKGxlbikgLyAoTWF0aC5MTjIgKiA3KSk7XG5cbiAgICAvLyBpZiAxIGJ5dGUgaXNuJ3QgZW5vdWdoIGZvciBlbmNvZGluZyBtZXNzYWdlIGxlbmd0aCwgc2hpZnQgdGhlIGRhdGEgdG8gdGhlIHJpZ2h0XG4gICAgcGJmLnJlYWxsb2MoZXh0cmFMZW4pO1xuICAgIGZvciAodmFyIGkgPSBwYmYucG9zIC0gMTsgaSA+PSBzdGFydFBvczsgaS0tKSBwYmYuYnVmW2kgKyBleHRyYUxlbl0gPSBwYmYuYnVmW2ldO1xufVxuXG5mdW5jdGlvbiB3cml0ZVBhY2tlZFZhcmludChhcnIsIHBiZikgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVWYXJpbnQoYXJyW2ldKTsgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNWYXJpbnQoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTVmFyaW50KGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZsb2F0KGFyciwgcGJmKSAgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGbG9hdChhcnJbaV0pOyAgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZERvdWJsZShhcnIsIHBiZikgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVEb3VibGUoYXJyW2ldKTsgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEJvb2xlYW4oYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVCb29sZWFuKGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZpeGVkMzIoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGaXhlZDMyKGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNGaXhlZDMyKGFyciwgcGJmKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTRml4ZWQzMihhcnJbaV0pOyB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZpeGVkNjQoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGaXhlZDY0KGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNGaXhlZDY0KGFyciwgcGJmKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTRml4ZWQ2NChhcnJbaV0pOyB9XG5cbi8vIEJ1ZmZlciBjb2RlIGJlbG93IGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIsIE1JVC1saWNlbnNlZFxuXG5mdW5jdGlvbiByZWFkVUludDMyKGJ1ZiwgcG9zKSB7XG4gICAgcmV0dXJuICgoYnVmW3Bvc10pIHxcbiAgICAgICAgKGJ1Zltwb3MgKyAxXSA8PCA4KSB8XG4gICAgICAgIChidWZbcG9zICsgMl0gPDwgMTYpKSArXG4gICAgICAgIChidWZbcG9zICsgM10gKiAweDEwMDAwMDApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUludDMyKGJ1ZiwgdmFsLCBwb3MpIHtcbiAgICBidWZbcG9zXSA9IHZhbDtcbiAgICBidWZbcG9zICsgMV0gPSAodmFsID4+PiA4KTtcbiAgICBidWZbcG9zICsgMl0gPSAodmFsID4+PiAxNik7XG4gICAgYnVmW3BvcyArIDNdID0gKHZhbCA+Pj4gMjQpO1xufVxuXG5mdW5jdGlvbiByZWFkSW50MzIoYnVmLCBwb3MpIHtcbiAgICByZXR1cm4gKChidWZbcG9zXSkgfFxuICAgICAgICAoYnVmW3BvcyArIDFdIDw8IDgpIHxcbiAgICAgICAgKGJ1Zltwb3MgKyAyXSA8PCAxNikpICtcbiAgICAgICAgKGJ1Zltwb3MgKyAzXSA8PCAyNCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRVdGY4KGJ1ZiwgcG9zLCBlbmQpIHtcbiAgICB2YXIgc3RyID0gJyc7XG4gICAgdmFyIGkgPSBwb3M7XG5cbiAgICB3aGlsZSAoaSA8IGVuZCkge1xuICAgICAgICB2YXIgYjAgPSBidWZbaV07XG4gICAgICAgIHZhciBjID0gbnVsbDsgLy8gY29kZXBvaW50XG4gICAgICAgIHZhciBieXRlc1BlclNlcXVlbmNlID1cbiAgICAgICAgICAgIGIwID4gMHhFRiA/IDQgOlxuICAgICAgICAgICAgYjAgPiAweERGID8gMyA6XG4gICAgICAgICAgICBiMCA+IDB4QkYgPyAyIDogMTtcblxuICAgICAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPiBlbmQpIGJyZWFrO1xuXG4gICAgICAgIHZhciBiMSwgYjIsIGIzO1xuXG4gICAgICAgIGlmIChieXRlc1BlclNlcXVlbmNlID09PSAxKSB7XG4gICAgICAgICAgICBpZiAoYjAgPCAweDgwKSB7XG4gICAgICAgICAgICAgICAgYyA9IGIwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGJ5dGVzUGVyU2VxdWVuY2UgPT09IDIpIHtcbiAgICAgICAgICAgIGIxID0gYnVmW2kgKyAxXTtcbiAgICAgICAgICAgIGlmICgoYjEgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgICAgIGMgPSAoYjAgJiAweDFGKSA8PCAweDYgfCAoYjEgJiAweDNGKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSAweDdGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChieXRlc1BlclNlcXVlbmNlID09PSAzKSB7XG4gICAgICAgICAgICBiMSA9IGJ1ZltpICsgMV07XG4gICAgICAgICAgICBiMiA9IGJ1ZltpICsgMl07XG4gICAgICAgICAgICBpZiAoKGIxICYgMHhDMCkgPT09IDB4ODAgJiYgKGIyICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgICAgICBjID0gKGIwICYgMHhGKSA8PCAweEMgfCAoYjEgJiAweDNGKSA8PCAweDYgfCAoYjIgJiAweDNGKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSAweDdGRiB8fCAoYyA+PSAweEQ4MDAgJiYgYyA8PSAweERGRkYpKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChieXRlc1BlclNlcXVlbmNlID09PSA0KSB7XG4gICAgICAgICAgICBiMSA9IGJ1ZltpICsgMV07XG4gICAgICAgICAgICBiMiA9IGJ1ZltpICsgMl07XG4gICAgICAgICAgICBiMyA9IGJ1ZltpICsgM107XG4gICAgICAgICAgICBpZiAoKGIxICYgMHhDMCkgPT09IDB4ODAgJiYgKGIyICYgMHhDMCkgPT09IDB4ODAgJiYgKGIzICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgICAgICBjID0gKGIwICYgMHhGKSA8PCAweDEyIHwgKGIxICYgMHgzRikgPDwgMHhDIHwgKGIyICYgMHgzRikgPDwgMHg2IHwgKGIzICYgMHgzRik7XG4gICAgICAgICAgICAgICAgaWYgKGMgPD0gMHhGRkZGIHx8IGMgPj0gMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGMgPSAweEZGRkQ7XG4gICAgICAgICAgICBieXRlc1BlclNlcXVlbmNlID0gMTtcblxuICAgICAgICB9IGVsc2UgaWYgKGMgPiAweEZGRkYpIHtcbiAgICAgICAgICAgIGMgLT0gMHgxMDAwMDtcbiAgICAgICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuICAgICAgICAgICAgYyA9IDB4REMwMCB8IGMgJiAweDNGRjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gcmVhZFV0ZjhUZXh0RGVjb2RlcihidWYsIHBvcywgZW5kKSB7XG4gICAgcmV0dXJuIHV0ZjhUZXh0RGVjb2Rlci5kZWNvZGUoYnVmLnN1YmFycmF5KHBvcywgZW5kKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlVXRmOChidWYsIHN0ciwgcG9zKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGMsIGxlYWQ7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpOyAvLyBjb2RlIHBvaW50XG5cbiAgICAgICAgaWYgKGMgPiAweEQ3RkYgJiYgYyA8IDB4RTAwMCkge1xuICAgICAgICAgICAgaWYgKGxlYWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IDB4REMwMCkge1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gMHhFRjtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkY7XG4gICAgICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEJEO1xuICAgICAgICAgICAgICAgICAgICBsZWFkID0gYztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IGxlYWQgLSAweEQ4MDAgPDwgMTAgfCBjIC0gMHhEQzAwIHwgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICAgICAgbGVhZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA+IDB4REJGRiB8fCAoaSArIDEgPT09IHN0ci5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEVGO1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gMHhCRjtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGVhZCA9IGM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGxlYWQpIHtcbiAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEVGO1xuICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkY7XG4gICAgICAgICAgICBidWZbcG9zKytdID0gMHhCRDtcbiAgICAgICAgICAgIGxlYWQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweDgwKSB7XG4gICAgICAgICAgICBidWZbcG9zKytdID0gYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChjIDwgMHg4MDApIHtcbiAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gYyA+PiAweDYgfCAweEMwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IDB4MTAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgPj4gMHhDIHwgMHhFMDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gYyA+PiAweDEyIHwgMHhGMDtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgPj4gMHhDICYgMHgzRiB8IDB4ODA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSBjID4+IDB4NiAmIDB4M0YgfCAweDgwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgJiAweDNGIHwgMHg4MDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcG9zO1xufVxuIiwiJ3VzZSBzdHJpY3QnOyAvLyBjb2RlIGdlbmVyYXRlZCBieSBwYmYgdjMuMi4xXG5sZXQgZXhwb3J0cyA9IHt9XG5cbmV4cG9ydCBjb25zdCBtdHlwZSA9IGV4cG9ydHMubXR5cGUgPSB7XG4gICAgXCJtdF91bmtub3duXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiAwLFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfaW9tZGF0YVwiOiB7XG4gICAgICAgIFwidmFsdWVcIjogMSxcbiAgICAgICAgXCJvcHRpb25zXCI6IHt9XG4gICAgfSxcbiAgICBcIm10X21pbm1heFwiOiB7XG4gICAgICAgIFwidmFsdWVcIjogMixcbiAgICAgICAgXCJvcHRpb25zXCI6IHt9XG4gICAgfSxcbiAgICBcIm10X3N5c2luZm9cIjoge1xuICAgICAgICBcInZhbHVlXCI6IDMsXG4gICAgICAgIFwib3B0aW9uc1wiOiB7fVxuICAgIH0sXG4gICAgXCJtdF90Y2RhdGFcIjoge1xuICAgICAgICBcInZhbHVlXCI6IDQsXG4gICAgICAgIFwib3B0aW9uc1wiOiB7fVxuICAgIH0sXG4gICAgXCJtdF92Z2NkYXRhXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA1LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfdGN6b25lXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA2LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfbWR0bXNnXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA3LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfaGVhbHRoc3RhdHVzXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA4LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9XG59O1xuXG5leHBvcnQgY29uc3QgUGJQcm9jZXNzU3RhdHVzID0gZXhwb3J0cy5QYlByb2Nlc3NTdGF0dXMgPSB7XG4gICAgXCJQcm9jZXNzU3RhdHVzVW5rbm93blwiOiB7XG4gICAgICAgIFwidmFsdWVcIjogMCxcbiAgICAgICAgXCJvcHRpb25zXCI6IHt9XG4gICAgfSxcbiAgICBcIlByb2Nlc3NTdGF0dXNQZW5kaW5nXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiAxLFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwiUHJvY2Vzc1N0YXR1c1N0YXJ0ZWRcIjoge1xuICAgICAgICBcInZhbHVlXCI6IDIsXG4gICAgICAgIFwib3B0aW9uc1wiOiB7fVxuICAgIH0sXG4gICAgXCJQcm9jZXNzU3RhdHVzQ2FuY2VsbGVkXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiAzLFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwiUHJvY2Vzc1N0YXR1c0NvbXBsZXRlZFwiOiB7XG4gICAgICAgIFwidmFsdWVcIjogNCxcbiAgICAgICAgXCJvcHRpb25zXCI6IHt9XG4gICAgfSxcbiAgICBcIlByb2Nlc3NTdGF0dXNGYWlsZWRcIjoge1xuICAgICAgICBcInZhbHVlXCI6IDUsXG4gICAgICAgIFwib3B0aW9uc1wiOiB7fVxuICAgIH0sXG4gICAgXCJQcm9jZXNzU3RhdHVzTWF4XCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA2LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9XG59O1xuXG4vLyB1bmtub3duX21zZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB1bmtub3duX21zZyA9IGV4cG9ydHMudW5rbm93bl9tc2cgPSB7fTtcblxudW5rbm93bl9tc2cucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh1bmtub3duX21zZy5fcmVhZEZpZWxkLCB7bXQ6IDB9LCBlbmQpO1xufTtcbnVua25vd25fbXNnLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG59O1xudW5rbm93bl9tc2cud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xufTtcblxuLy8gaW9tZGF0YSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBpb21kYXRhID0gZXhwb3J0cy5pb21kYXRhID0ge307XG5cbmlvbWRhdGEucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhpb21kYXRhLl9yZWFkRmllbGQsIHttdDogMCwgdG90YWxfZF9pbnB1dHM6IDAsIHRvdGFsX2Rfb3V0cHV0czogMCwgdG90YWxfYV9pbnB1dHM6IDAsIHRvdGFsX2Ffb3V0cHV0czogMCwgZF9pbnB1dHM6IG51bGwsIGRfb3V0cHV0czogbnVsbCwgYV9pbnB1dHM6IG51bGwsIGFfb3V0cHV0czogbnVsbH0sIGVuZCk7XG59O1xuaW9tZGF0YS5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnRvdGFsX2RfaW5wdXRzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDMpIG9iai50b3RhbF9kX291dHB1dHMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLnRvdGFsX2FfaW5wdXRzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDUpIG9iai50b3RhbF9hX291dHB1dHMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNikgb2JqLmRfaW5wdXRzID0gcGJmLnJlYWRCeXRlcygpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNykgb2JqLmRfb3V0cHV0cyA9IHBiZi5yZWFkQnl0ZXMoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDgpIG9iai5hX2lucHV0cyA9IHBiZi5yZWFkQnl0ZXMoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDkpIG9iai5hX291dHB1dHMgPSBwYmYucmVhZEJ5dGVzKCk7XG59O1xuaW9tZGF0YS53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai50b3RhbF9kX2lucHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnRvdGFsX2RfaW5wdXRzKTtcbiAgICBpZiAob2JqLnRvdGFsX2Rfb3V0cHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoMywgb2JqLnRvdGFsX2Rfb3V0cHV0cyk7XG4gICAgaWYgKG9iai50b3RhbF9hX2lucHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoNCwgb2JqLnRvdGFsX2FfaW5wdXRzKTtcbiAgICBpZiAob2JqLnRvdGFsX2Ffb3V0cHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLnRvdGFsX2Ffb3V0cHV0cyk7XG4gICAgaWYgKG9iai5kX2lucHV0cykgcGJmLndyaXRlQnl0ZXNGaWVsZCg2LCBvYmouZF9pbnB1dHMpO1xuICAgIGlmIChvYmouZF9vdXRwdXRzKSBwYmYud3JpdGVCeXRlc0ZpZWxkKDcsIG9iai5kX291dHB1dHMpO1xuICAgIGlmIChvYmouYV9pbnB1dHMpIHBiZi53cml0ZUJ5dGVzRmllbGQoOCwgb2JqLmFfaW5wdXRzKTtcbiAgICBpZiAob2JqLmFfb3V0cHV0cykgcGJmLndyaXRlQnl0ZXNGaWVsZCg5LCBvYmouYV9vdXRwdXRzKTtcbn07XG5cbi8vIG1pbm1heCA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBtaW5tYXggPSBleHBvcnRzLm1pbm1heCA9IHt9O1xuXG5taW5tYXgucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhtaW5tYXguX3JlYWRGaWVsZCwge210OiAwLCBtaW5fem9uZTogMCwgbWF4X3pvbmU6IDAsIG1pbjogMCwgbWF4OiAwfSwgZW5kKTtcbn07XG5taW5tYXguX3JlYWRGaWVsZCA9IGZ1bmN0aW9uICh0YWcsIG9iaiwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PT0gMSkgb2JqLm10ID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDIpIG9iai5taW5fem9uZSA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmoubWF4X3pvbmUgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLm1pbiA9IHBiZi5yZWFkVmFyaW50KHRydWUpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNSkgb2JqLm1heCA9IHBiZi5yZWFkVmFyaW50KHRydWUpO1xufTtcbm1pbm1heC53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5taW5fem9uZSkgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLm1pbl96b25lKTtcbiAgICBpZiAob2JqLm1heF96b25lKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgzLCBvYmoubWF4X3pvbmUpO1xuICAgIGlmIChvYmoubWluKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg0LCBvYmoubWluKTtcbiAgICBpZiAob2JqLm1heCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLm1heCk7XG59O1xuXG4vLyBzeXNpbmZvID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IHN5c2luZm8gPSBleHBvcnRzLnN5c2luZm8gPSB7fTtcblxuc3lzaW5mby5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKHN5c2luZm8uX3JlYWRGaWVsZCwge210OiAwLCBzdGF0ZTogMCwgb3JkZXJfc3RhdHVzOiAwLCBvcmRlcl9pZDogMCwgdGFyZ2V0OiAwLCBpbmpfY3ljbGU6IDAsIGN5Y2xlX2lkOiAwLCBnb29kX3BhcnRzOiAwLCB0ZXh0X21lc3NhZ2U6IFwiXCIsIG1zZzogbnVsbCwgZG1zZzogbnVsbH0sIGVuZCk7XG59O1xuc3lzaW5mby5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnN0YXRlID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIG9iai5vcmRlcl9zdGF0dXMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNSkgb2JqLm9yZGVyX2lkID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA2KSBvYmoudGFyZ2V0ID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA3KSBvYmouaW5qX2N5Y2xlID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA4KSBvYmouY3ljbGVfaWQgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDkpIG9iai5nb29kX3BhcnRzID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmoudGV4dF9tZXNzYWdlID0gcGJmLnJlYWRTdHJpbmcoKSwgb2JqLm1zZyA9IFwidGV4dF9tZXNzYWdlXCI7XG4gICAgZWxzZSBpZiAodGFnID09PSAxMCkgb2JqLmRtc2cgPSBkYm1zZy5yZWFkKHBiZiwgcGJmLnJlYWRWYXJpbnQoKSArIHBiZi5wb3MpLCBvYmoubXNnID0gXCJkbXNnXCI7XG59O1xuc3lzaW5mby53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5zdGF0ZSkgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnN0YXRlKTtcbiAgICBpZiAob2JqLm9yZGVyX3N0YXR1cykgcGJmLndyaXRlVmFyaW50RmllbGQoNCwgb2JqLm9yZGVyX3N0YXR1cyk7XG4gICAgaWYgKG9iai5vcmRlcl9pZCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLm9yZGVyX2lkKTtcbiAgICBpZiAob2JqLnRhcmdldCkgcGJmLndyaXRlVmFyaW50RmllbGQoNiwgb2JqLnRhcmdldCk7XG4gICAgaWYgKG9iai5pbmpfY3ljbGUpIHBiZi53cml0ZVZhcmludEZpZWxkKDcsIG9iai5pbmpfY3ljbGUpO1xuICAgIGlmIChvYmouY3ljbGVfaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDgsIG9iai5jeWNsZV9pZCk7XG4gICAgaWYgKG9iai5nb29kX3BhcnRzKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg5LCBvYmouZ29vZF9wYXJ0cyk7XG4gICAgaWYgKG9iai50ZXh0X21lc3NhZ2UpIHBiZi53cml0ZVN0cmluZ0ZpZWxkKDMsIG9iai50ZXh0X21lc3NhZ2UpO1xuICAgIGlmIChvYmouZG1zZykgcGJmLndyaXRlTWVzc2FnZSgxMCwgZGJtc2cud3JpdGUsIG9iai5kbXNnKTtcbn07XG5cbi8vIGRibXNnID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IGRibXNnID0gZXhwb3J0cy5kYm1zZyA9IHt9O1xuXG5kYm1zZy5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKGRibXNnLl9yZWFkRmllbGQsIHtkYmlkOiAwLCBwYXJhbWV0ZXJzOiBcIlwifSwgZW5kKTtcbn07XG5kYm1zZy5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxMDApIG9iai5kYmlkID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSAxMDEpIG9iai5wYXJhbWV0ZXJzID0gcGJmLnJlYWRTdHJpbmcoKTtcbn07XG5kYm1zZy53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmouZGJpZCkgcGJmLndyaXRlVmFyaW50RmllbGQoMTAwLCBvYmouZGJpZCk7XG4gICAgaWYgKG9iai5wYXJhbWV0ZXJzKSBwYmYud3JpdGVTdHJpbmdGaWVsZCgxMDEsIG9iai5wYXJhbWV0ZXJzKTtcbn07XG5cbi8vIG1kdG1zZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBtZHRtc2cgPSBleHBvcnRzLm1kdG1zZyA9IHt9O1xuXG5tZHRtc2cucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhtZHRtc2cuX3JlYWRGaWVsZCwge210OiAwLCBwcm9ncmVzczogMCwgZGJpZDogMCwgcGFyYW1ldGVyczogXCJcIn0sIGVuZCk7XG59O1xubWR0bXNnLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmoucHJvZ3Jlc3MgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDEwMCkgb2JqLmRiaWQgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDEwMSkgb2JqLnBhcmFtZXRlcnMgPSBwYmYucmVhZFN0cmluZygpO1xufTtcbm1kdG1zZy53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5wcm9ncmVzcykgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnByb2dyZXNzKTtcbiAgICBpZiAob2JqLmRiaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEwMCwgb2JqLmRiaWQpO1xuICAgIGlmIChvYmoucGFyYW1ldGVycykgcGJmLndyaXRlU3RyaW5nRmllbGQoMTAxLCBvYmoucGFyYW1ldGVycyk7XG59O1xuXG4vLyB0Y2RhdGEgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgdGNkYXRhID0gZXhwb3J0cy50Y2RhdGEgPSB7fTtcblxudGNkYXRhLnJlYWQgPSBmdW5jdGlvbiAocGJmLCBlbmQpIHtcbiAgICByZXR1cm4gcGJmLnJlYWRGaWVsZHModGNkYXRhLl9yZWFkRmllbGQsIHttdDogMCwgc2xpY2VfaWQ6IDAsIHpvbmVzOiAwLCByZWNvcmRzOiBbXX0sIGVuZCk7XG59O1xudGNkYXRhLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmouc2xpY2VfaWQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMykgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIHBiZi5yZWFkUGFja2VkVmFyaW50KG9iai5yZWNvcmRzLCB0cnVlKTtcbn07XG50Y2RhdGEud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xuICAgIGlmIChvYmouc2xpY2VfaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDIsIG9iai5zbGljZV9pZCk7XG4gICAgaWYgKG9iai56b25lcykgcGJmLndyaXRlVmFyaW50RmllbGQoMywgb2JqLnpvbmVzKTtcbiAgICBpZiAob2JqLnJlY29yZHMpIHBiZi53cml0ZVBhY2tlZFZhcmludCg0LCBvYmoucmVjb3Jkcyk7XG59O1xuXG4vLyB2Z2NkYXRhID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IHZnY2RhdGEgPSBleHBvcnRzLnZnY2RhdGEgPSB7fTtcblxudmdjZGF0YS5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKHZnY2RhdGEuX3JlYWRGaWVsZCwge210OiAwLCBzbGljZV9pZDogMCwgem9uZXM6IDAsIHJlY29yZHM6IFtdfSwgZW5kKTtcbn07XG52Z2NkYXRhLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmouc2xpY2VfaWQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMykgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIHBiZi5yZWFkUGFja2VkVmFyaW50KG9iai5yZWNvcmRzLCB0cnVlKTtcbn07XG52Z2NkYXRhLndyaXRlID0gZnVuY3Rpb24gKG9iaiwgcGJmKSB7XG4gICAgaWYgKG9iai5tdCkgcGJmLndyaXRlVmFyaW50RmllbGQoMSwgb2JqLm10KTtcbiAgICBpZiAob2JqLnNsaWNlX2lkKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgyLCBvYmouc2xpY2VfaWQpO1xuICAgIGlmIChvYmouem9uZXMpIHBiZi53cml0ZVZhcmludEZpZWxkKDMsIG9iai56b25lcyk7XG4gICAgaWYgKG9iai5yZWNvcmRzKSBwYmYud3JpdGVQYWNrZWRWYXJpbnQoNCwgb2JqLnJlY29yZHMpO1xufTtcblxuLy8gdGN6b25lX3JlY29yZCA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB0Y3pvbmVfcmVjb3JkID0gZXhwb3J0cy50Y3pvbmVfcmVjb3JkID0ge307XG5cbnRjem9uZV9yZWNvcmQucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh0Y3pvbmVfcmVjb3JkLl9yZWFkRmllbGQsIHt0ZW1wX3NwOiAwLCBtYW51YWxfc3A6IDAsIGFjdHVhbF90ZW1wOiAwLCBhY3R1YWxfcGVyY2VudDogMCwgYWN0dWFsX2N1cnJlbnQ6IDAsIHNldHRpbmdzOiAwLCB0ZW1wZXJhdHVyZV9hbGFybTogMCwgcG93ZXJfYWxhcm06IDB9LCBlbmQpO1xufTtcbnRjem9uZV9yZWNvcmQuX3JlYWRGaWVsZCA9IGZ1bmN0aW9uICh0YWcsIG9iaiwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PT0gMSkgb2JqLnRlbXBfc3AgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLm1hbnVhbF9zcCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmouYWN0dWFsX3RlbXAgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLmFjdHVhbF9wZXJjZW50ID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDUpIG9iai5hY3R1YWxfY3VycmVudCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSA2KSBvYmouc2V0dGluZ3MgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNykgb2JqLnRlbXBlcmF0dXJlX2FsYXJtID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDgpIG9iai5wb3dlcl9hbGFybSA9IHBiZi5yZWFkVmFyaW50KCk7XG59O1xudGN6b25lX3JlY29yZC53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoudGVtcF9zcCkgcGJmLndyaXRlVmFyaW50RmllbGQoMSwgb2JqLnRlbXBfc3ApO1xuICAgIGlmIChvYmoubWFudWFsX3NwKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgyLCBvYmoubWFudWFsX3NwKTtcbiAgICBpZiAob2JqLmFjdHVhbF90ZW1wKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgzLCBvYmouYWN0dWFsX3RlbXApO1xuICAgIGlmIChvYmouYWN0dWFsX3BlcmNlbnQpIHBiZi53cml0ZVZhcmludEZpZWxkKDQsIG9iai5hY3R1YWxfcGVyY2VudCk7XG4gICAgaWYgKG9iai5hY3R1YWxfY3VycmVudCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLmFjdHVhbF9jdXJyZW50KTtcbiAgICBpZiAob2JqLnNldHRpbmdzKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg2LCBvYmouc2V0dGluZ3MpO1xuICAgIGlmIChvYmoudGVtcGVyYXR1cmVfYWxhcm0pIHBiZi53cml0ZVZhcmludEZpZWxkKDcsIG9iai50ZW1wZXJhdHVyZV9hbGFybSk7XG4gICAgaWYgKG9iai5wb3dlcl9hbGFybSkgcGJmLndyaXRlVmFyaW50RmllbGQoOCwgb2JqLnBvd2VyX2FsYXJtKTtcbn07XG5cbi8vIHRjem9uZSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB0Y3pvbmUgPSBleHBvcnRzLnRjem9uZSA9IHt9O1xuXG50Y3pvbmUucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh0Y3pvbmUuX3JlYWRGaWVsZCwge210OiAwLCB6b25lczogMCwgcmVjb3JkczogW119LCBlbmQpO1xufTtcbnRjem9uZS5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDMpIG9iai5yZWNvcmRzLnB1c2godGN6b25lX3JlY29yZC5yZWFkKHBiZiwgcGJmLnJlYWRWYXJpbnQoKSArIHBiZi5wb3MpKTtcbn07XG50Y3pvbmUud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xuICAgIGlmIChvYmouem9uZXMpIHBiZi53cml0ZVZhcmludEZpZWxkKDIsIG9iai56b25lcyk7XG4gICAgaWYgKG9iai5yZWNvcmRzKSBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5yZWNvcmRzLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVNZXNzYWdlKDMsIHRjem9uZV9yZWNvcmQud3JpdGUsIG9iai5yZWNvcmRzW2ldKTtcbn07XG5cbi8vIGhlYWx0aHN0YXR1cyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBoZWFsdGhzdGF0dXMgPSBleHBvcnRzLmhlYWx0aHN0YXR1cyA9IHt9O1xuXG5oZWFsdGhzdGF0dXMucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhoZWFsdGhzdGF0dXMuX3JlYWRGaWVsZCwge210OiAwLCBzdGF0dXM6IFtdfSwgZW5kKTtcbn07XG5oZWFsdGhzdGF0dXMuX3JlYWRGaWVsZCA9IGZ1bmN0aW9uICh0YWcsIG9iaiwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PT0gMSkgb2JqLm10ID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDIpIG9iai5zdGF0dXMucHVzaChoZWFsdGhzdGF0dXMuUHJvY2Vzc1N0YXR1cy5yZWFkKHBiZiwgcGJmLnJlYWRWYXJpbnQoKSArIHBiZi5wb3MpKTtcbn07XG5oZWFsdGhzdGF0dXMud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xuICAgIGlmIChvYmouc3RhdHVzKSBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5zdGF0dXMubGVuZ3RoOyBpKyspIHBiZi53cml0ZU1lc3NhZ2UoMiwgaGVhbHRoc3RhdHVzLlByb2Nlc3NTdGF0dXMud3JpdGUsIG9iai5zdGF0dXNbaV0pO1xufTtcblxuLy8gaGVhbHRoc3RhdHVzLlByb2Nlc3NTdGF0dXMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5oZWFsdGhzdGF0dXMuUHJvY2Vzc1N0YXR1cyA9IHt9O1xuXG5oZWFsdGhzdGF0dXMuUHJvY2Vzc1N0YXR1cy5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKGhlYWx0aHN0YXR1cy5Qcm9jZXNzU3RhdHVzLl9yZWFkRmllbGQsIHtzdGF0dXM6IDAsIHNlY3M6IDB9LCBlbmQpO1xufTtcbmhlYWx0aHN0YXR1cy5Qcm9jZXNzU3RhdHVzLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5zdGF0dXMgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDIpIG9iai5zZWNzID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG59O1xuaGVhbHRoc3RhdHVzLlByb2Nlc3NTdGF0dXMud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLnN0YXR1cykgcGJmLndyaXRlVmFyaW50RmllbGQoMSwgb2JqLnN0YXR1cyk7XG4gICAgaWYgKG9iai5zZWNzKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgyLCBvYmouc2Vjcyk7XG59O1xuIiwiZXhwb3J0IGNvbnN0IG1heENodW5rU2l6ZSA9IDEwMFxuXG5sZXQgcGFyYW1zID0ge1xuICByYXRlOiAxMFxufVxuXG5sZXQgYnVmZmVyID0gW11cblxuXG4vLyBlbnN1cmUgYnVmZmVyIGlzIG5ldmVyIGZpbGxlZCBmYXN0ZXIgdGhhbiB0aGUgc3BlY2lmaWVkIHJhdGVcbmNvbnN0IHRyeVB1c2ggPSAoZnJhbWUpID0+IHtcbiAgZnJhbWUudHMgPSBmcmFtZS50aW1lLmdldFRpbWUoKVxuICBjb25zdCBsYXN0RnJhbWUgPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdXG4gIGlmKCFsYXN0RnJhbWUpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgICByZXR1cm5cbiAgfVxuICAvLyBtaW4gaW50ZXJ2YWwgaXMgbWluIG1zIGJldHdlZW4gZnJhbWVzIHdpdGggNW1zIHBhZGRpbmdcbiAgY29uc3QgbWluSW50dmwgPSAxMDAwIC8gcGFyYW1zLnJhdGUgKyA1XG4gIGlmKGZyYW1lLnRpbWUgLSBsYXN0RnJhbWUudGltZSA+PSBtaW5JbnR2bCkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbiAoeyB0cywgZGF0YSB9KSB7XG5cbiAgLy8gc2ltdWxhdGUgNDUwIHpvbmVzXG4gIC8vIGRhdGEgPSBkYXRhLmNvbmNhdChkYXRhKS5jb25jYXQoZGF0YSlcblxuICBjb25zdCBkYXRlID0gbmV3IERhdGUodHMpXG4gIGNvbnN0IGZyYW1lID0geyBkYXRhLCBkYXRlLCB0aW1lOiB0cyB9XG5cbiAgdHJ5UHVzaChmcmFtZSlcbiAgLy8gdHdlZW4oZnJhbWUsIDEyKVxuXG4gIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgtNzUwMClcbn1cblxuXG5sZXQgaW50ZXJ2YWxzID0ge31cbmxldCBsYXRlc3QgPSB7fVxubGV0IGVhcmxpZXN0ID0ge31cbmxldCBuZWVkc1Jlc2V0ID0ge31cblxuZXhwb3J0IGNvbnN0IGJ1ZmZlckNvbW1hbmRzID0gKHBvcnQsIGUsIGlkKSA9PiB7XG4gIGNvbnN0IHsgZGF0YSB9ID0gZVxuXG4gIGNvbnN0IHBvc3QgPSAoZGF0YSkgPT4ge1xuICAgIGlmKHBvcnQpIHtcbiAgICAgIHBvcnQucG9zdE1lc3NhZ2UoZGF0YSlcbiAgICB9IGVsc2Uge1xuICAgICAgcG9zdE1lc3NhZ2VcbiAgICB9XG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdyZWFkQnVmZmVyJykge1xuXG4gICAgLy8gc2VuZCBkYXRhIGluIGJhdGNoZXMsIGxpbWl0aW5nIG1heCB0byBhdm9pZCBPT00gd2hlbiBzZXJpYWxpemluZyB0b1xuICAgIC8vIHBhc3MgYmV0d2VlbiB0aHJlYWRzXG4gICAgY29uc3Qgc2VuZENodW5rID0gKCkgPT4ge1xuICAgICAgY29uc3QgcmVzZXRCdWZmZXIgPSAoKSA9PiB7XG4gICAgICAgIGxhdGVzdFtpZF0gPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdICYmIGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV0udHNcbiAgICAgICAgZWFybGllc3RbaWRdID0gbGF0ZXN0W2lkXSArIDFcbiAgICAgICAgbmVlZHNSZXNldFtpZF0gPSBmYWxzZVxuICAgICAgfVxuICAgICAgaWYgKCFsYXRlc3RbaWRdICYmIGJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgcmVzZXRCdWZmZXIoKVxuICAgICAgfVxuXG4gICAgICBpZihuZWVkc1Jlc2V0W2lkXSkge1xuICAgICAgICBwb3N0KCdyZXNldCcpXG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGlmKGxhdGVzdFtpZF0pIHtcbiAgICAgICAgY29uc3QgbmV3ZXN0ID0gYnVmZmVyLmZpbHRlcih4ID0+IHgudHMgPiBsYXRlc3RbaWRdKVxuICAgICAgICBjb25zdCBiYWNrRmlsbCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzIDwgZWFybGllc3RbaWRdKS5zbGljZSgtKG1heENodW5rU2l6ZSAtIG5ld2VzdC5sZW5ndGgpKVxuICAgICAgICBjb25zdCB1cGRhdGUgPSBiYWNrRmlsbC5jb25jYXQobmV3ZXN0KVxuICAgICAgICBpZiAodXBkYXRlLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IGxhdGVzdEVudHJ5ID0gdXBkYXRlW3VwZGF0ZS5sZW5ndGggLSAxXVxuICAgICAgICAgIGNvbnN0IGZpcnN0RW50cnkgPSB1cGRhdGVbMF1cbiAgICAgICAgICBsYXRlc3RbaWRdID0gbGF0ZXN0RW50cnkudGltZVxuICAgICAgICAgIGlmKGZpcnN0RW50cnkudGltZSA8IGVhcmxpZXN0W2lkXSkgZWFybGllc3RbaWRdID0gZmlyc3RFbnRyeS50aW1lXG4gICAgICAgICAgcG9zdCh7IHVwZGF0ZSwgcGFyYW1zIH0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNvbnNvbGUubG9nKHNpemVPZihbIC4uLmJ1ZmZlciBdKSlcbiAgICB9XG5cbiAgICBpbnRlcnZhbHNbaWRdID0gc2V0SW50ZXJ2YWwoc2VuZENodW5rLCAyMDApXG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdzZXRCdWZmZXJQYXJhbXMnKSB7XG4gICAgbGV0IHJlc2V0ID0gZmFsc2VcbiAgICBmb3IobGV0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhLnBhcmFtcykpIHtcbiAgICAgIGlmKGRhdGEucGFyYW1zW2tleV0gIT0gcGFyYW1zW2tleV0pIHtcbiAgICAgICAgcmVzZXQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIHBhcmFtcyA9IHsgLi4ucGFyYW1zLCAuLi5kYXRhLnBhcmFtcyB8fCB7fX1cbiAgICBpZihyZXNldCkge1xuICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDAsIDApXG4gICAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMobmVlZHNSZXNldCkpIHtcbiAgICAgICAgbmVlZHNSZXNldFtrZXldID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ2Nsb3NlJykge1xuICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxzW2lkXSlcbiAgICBsYXRlc3RbaWRdID0gMFxuICB9XG59XG5cblxuXG5cblxuXG4vLyB1dGlsaXRpZXMgZm9yIHRlc3RpbmdcblxuY29uc3QgdHdlZW4gPSAobmV4dCwgZnJhbWVzKSA9PiB7XG5cbiAgbGV0IGZyYW1lTGlzdCA9IFtdXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgZnJhbWVzOyBpKyspIHtcbiAgICBmcmFtZUxpc3QucHVzaChpKVxuICB9XG5cbiAgY29uc3QgeyB0aW1lLCBkYXRhIH0gPSBuZXh0XG4gIGNvbnN0IGxhc3RCdWZmZXIgPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdXG5cbiAgLy8gdGVzdCB0d2VlbmluZ1xuICBpZiAobGFzdEJ1ZmZlcikge1xuICAgIGZvciAobGV0IHggb2YgZnJhbWVMaXN0KSB7XG4gICAgICBsZXQgdHdlZW4gPSBbXVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0QnVmZmVyLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGFzdCA9IGxhc3RCdWZmZXIuZGF0YVtpXVxuICAgICAgICBjb25zdCBjdXJyZW50ID0gZGF0YVtpXVxuICAgICAgICBpZiAobGFzdCAmJiBjdXJyZW50KSB7XG4gICAgICAgICAgbGV0IHR3ZWVuZWQgPSB7IC4uLmN1cnJlbnQgfVxuICAgICAgICAgIGZvciAobGV0IHByb3Agb2YgWyAnYWN0dWFsX3RlbXAnLCAnYWN0dWFsX2N1cnJlbnQnLCAnYWN0dWFsX3BlcmNlbnQnIF0pIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHByb3ApXG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IChjdXJyZW50W3Byb3BdIC0gbGFzdFtwcm9wXSkgLyBmcmFtZXNcbiAgICAgICAgICAgIHR3ZWVuZWRbcHJvcF0gPSBsYXN0W3Byb3BdICsgZGVsdGEgKiB4XG4gICAgICAgICAgfVxuICAgICAgICAgIHR3ZWVuLnB1c2godHdlZW5lZClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3Qgb2Zmc2V0ID0gNTAwIC8gZnJhbWVzICogeFxuICAgICAgY29uc3QgdXBkYXRlZFRTID0gdGltZSAtIDUwMCArIG9mZnNldFxuICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHVwZGF0ZWRUUylcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdHJ5UHVzaCh7IHRpbWU6IG5ldyBEYXRlKHVwZGF0ZWRUUyksIHRzOiB1cGRhdGVkVFMsIGRhdGUsIGRhdGE6IHR3ZWVuIH0pLCBvZmZzZXQpXG4gICAgfVxuICB9XG4gIHNldFRpbWVvdXQoKCkgPT4gdHJ5UHVzaChuZXh0KSwgNTAwKVxufVxuXG5cblxuY29uc3QgdHlwZVNpemVzID0ge1xuICBcInVuZGVmaW5lZFwiOiAoKSA9PiAwLFxuICBcImJvb2xlYW5cIjogKCkgPT4gNCxcbiAgXCJudW1iZXJcIjogKCkgPT4gOCxcbiAgXCJzdHJpbmdcIjogaXRlbSA9PiAyICogaXRlbS5sZW5ndGgsXG4gIFwib2JqZWN0XCI6IGl0ZW0gPT4gIWl0ZW0gPyAwIDogT2JqZWN0XG4gICAgLmtleXMoaXRlbSlcbiAgICAucmVkdWNlKCh0b3RhbCwga2V5KSA9PiBzaXplT2Yoa2V5KSArIHNpemVPZihpdGVtW2tleV0pICsgdG90YWwsIDApXG59XG5cbmNvbnN0IHNpemVPZiA9IHZhbHVlID0+IHR5cGVTaXplc1t0eXBlb2YgdmFsdWVdKHZhbHVlKVxuIiwiaW1wb3J0IFBiZiBmcm9tICdwYmYnXG5pbXBvcnQgeyB0Y2RhdGEsIG1pbm1heCwgdW5rbm93bl9tc2csIHRjem9uZSwgc3lzaW5mbywgbWR0bXNnLCBoZWFsdGhzdGF0dXMgfSBmcm9tICcuL2RlY29kZS5wcm90bydcbmltcG9ydCBkYXRhQnVmZmVyLCB7IGJ1ZmZlckNvbW1hbmRzIH0gZnJvbSAnLi9idWZmZXInXG5cbmNvbnN0IG1lc3NhZ2VUeXBlcyA9IHsgdGNkYXRhLCBtaW5tYXgsIHVua25vd25fbXNnLCB0Y3pvbmUsIHN5c2luZm8sIG1kdG1zZywgaGVhbHRoc3RhdHVzIH1cblxubGV0IHNvY2tldFxubGV0IHBvcnRzID0gW11cblxubGV0IGNvbm5lY3RlZENoYW5uZWxzID0gW11cbmxldCBhY3RpdmVDaGFubmVscyA9IFtdXG5cbmNvbnN0IHVwZGF0ZUFjdGl2ZSA9IGFzeW5jICgpID0+IHtcbiAgYWN0aXZlQ2hhbm5lbHMgPSBbXVxuICBmb3IobGV0IHAgb2YgcG9ydHMpIHtcbiAgICBhY3RpdmVDaGFubmVscyA9IGFjdGl2ZUNoYW5uZWxzLmNvbmNhdChwLnN1YnNjcmlwdGlvbnMpXG4gIH1cbiAgYWN0aXZlQ2hhbm5lbHMgPSBbIC4uLiBuZXcgU2V0KGFjdGl2ZUNoYW5uZWxzKSBdXG4gIGZvcihsZXQgYyBvZiBjb25uZWN0ZWRDaGFubmVscykge1xuICAgIGlmKCFhY3RpdmVDaGFubmVscy5pbmNsdWRlcyhjKSkge1xuICAgICAgYXdhaXQgc2VuZChgLSR7Y31gKVxuICAgIH1cbiAgfVxuICBhd2FpdCBjb25uZWN0KClcbn1cblxuY29uc3QgZ2V0UG9ydERhdGEgPSBwb3J0ID0+IHtcbiAgY29uc3QgcCA9IHBvcnRzLmZpbmQoeCA9PiB4LnBvcnQgPT0gcG9ydClcbiAgcmV0dXJuIHAgPyBwLmRhdGEgOiB7fVxufVxuXG5jb25zdCBzZXRQb3J0RGF0YSA9IChwb3J0LCBkYXRhKSA9PiB7XG4gIGNvbnN0IHAgPSBwb3J0cy5maW5kKHggPT4geC5wb3J0ID09IHBvcnQpXG4gIGlmKCFwKSB7XG4gICAgcG9ydHMucHVzaCh7IC4uLmRhdGEsIHBvcnQgfSlcbiAgfSBlbHNlIHtcbiAgICBwb3J0cyA9IHBvcnRzLm1hcCh4ID0+IHtcbiAgICAgIGlmKHgucG9ydCA9PSBwb3J0KSB7XG4gICAgICAgIHJldHVybiB7IC4uLngsIC4uLmRhdGEsIHBvcnQgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHhcbiAgICB9KVxuICB9XG59XG5cbmNvbnN0IGFkZFBvcnRTdWJzY3JpcHRpb25zID0gKHBvcnQsIHN1YnNjcmlwdGlvbnMpID0+IHtcbiAgY29uc3QgY3VycmVudCA9IChnZXRQb3J0RGF0YShwb3J0KSB8fCB7fSkuc3Vic2NyaXB0aW9ucyB8fCBbXVxuICBzZXRQb3J0RGF0YShwb3J0LCB7XG4gICAgc3Vic2NyaXB0aW9uczogWyAuLi4gbmV3IFNldChjdXJyZW50LmNvbmNhdChzdWJzY3JpcHRpb25zKSkgXVxuICB9KVxuICB1cGRhdGVBY3RpdmUoKVxufVxuXG5cbmxldCByZWFkeSA9IGZhbHNlXG5sZXQgc29ja2V0VGFyZ2V0XG5sZXQgcXVldWUgPSBbXVxuXG5jb25zdCBpbml0aWF0ZSA9IGFzeW5jICgpID0+IHtcbiAgcmVhZHkgPSB0cnVlXG4gIGZvcihsZXQgZm4gb2YgcXVldWUpIHtcbiAgICBmbigpXG4gIH1cbiAgY29ubmVjdCgpXG59XG5cbihmdW5jdGlvbiAoKSB7XG4gIEZpbGUucHJvdG90eXBlLmFycmF5QnVmZmVyID0gRmlsZS5wcm90b3R5cGUuYXJyYXlCdWZmZXIgfHwgbXlBcnJheUJ1ZmZlclxuICBCbG9iLnByb3RvdHlwZS5hcnJheUJ1ZmZlciA9IEJsb2IucHJvdG90eXBlLmFycmF5QnVmZmVyIHx8IG15QXJyYXlCdWZmZXJcblxuICBmdW5jdGlvbiBteUFycmF5QnVmZmVyKCkge1xuICAgIC8vIHRoaXM6IEZpbGUgb3IgQmxvYlxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgbGV0IGZyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgICAgZnIub25sb2FkID0gKCkgPT4ge1xuICAgICAgICByZXNvbHZlKGZyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIGZyLnJlYWRBc0FycmF5QnVmZmVyKHRoaXMpXG4gICAgfSlcbiAgfVxufSkoKVxuXG5cbmNvbnN0IGNyZWF0ZVNvY2tldCA9ICgpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgaWYocmVhZHkpIHJlc29sdmUoKVxuICBpZighc29ja2V0KSB7XG4gICAgc29ja2V0ID0gbmV3IFdlYlNvY2tldChzb2NrZXRUYXJnZXQpXG5cbiAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsIGUgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ1NvY2tldCBjb25uZWN0aW9uIGVzdGFibGlzaGVkJylcbiAgICAgIHBvc3RNZXNzYWdlKCdjb25uZWN0ZWQnKVxuICAgICAgaW5pdGlhdGUoKVxuICAgICAgLy8gY29ubmVjdCgpXG4gICAgfSlcblxuICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgYXN5bmMgZSA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhlKVxuICAgICAgY29uc3QgdHMgPSBuZXcgRGF0ZSgpXG5cbiAgICAgIGNvbnN0IGJsb2IgPSBlLmRhdGFcbiAgICAgIC8vIGNvbnNvbGUubG9nKGUuZGF0YSlcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGJsb2IuYXJyYXlCdWZmZXIoKVxuICAgICAgY29uc3QgcGJmID0gbmV3IFBiZihidWZmZXIpXG5cbiAgICAgIGNvbnN0IHsgbXQgfSA9IHVua25vd25fbXNnLnJlYWQocGJmKVxuICAgICAgY29uc3QgZGVjb2RlcnMgPSB7XG4gICAgICAgIDI6ICdtaW5tYXgnLFxuICAgICAgICAzOiAnc3lzaW5mbycsXG4gICAgICAgIDQ6ICd0Y2RhdGEnLFxuICAgICAgICA2OiAndGN6b25lJyxcbiAgICAgICAgNzogJ21kdG1zZycsXG4gICAgICAgIDg6ICdoZWFsdGhzdGF0dXMnXG4gICAgICB9XG4gICAgICBjb25zdCB0eXBlID0gZGVjb2RlcnNbbXRdXG5cbiAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlVHlwZXNbdHlwZV0ucmVhZChuZXcgUGJmKGJ1ZmZlcikpXG5cbiAgICAgIC8vIERFUFJFQ0FURUQ6IG5vIFVpbnQ4QXJyYXlzIGN1cnJlbnRseSBiZWluZyBwYXNzZWRcblxuICAgICAgLy8gZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgIC8vICAgaWYoZGF0YVtrZXldICYmIGRhdGFba2V5XS5jb25zdHJ1Y3RvciA9PT0gVWludDhBcnJheSkge1xuICAgICAgLy8gICAgIGRhdGFba2V5XSA9IGdldFN0cmluZyhkYXRhW2tleV0pXG4gICAgICAvLyAgIH1cbiAgICAgIC8vIH1cblxuICAgICAgLy8gcG9ydHNbMF0ucG9ydC5wb3N0TWVzc2FnZShkYXRhKVxuXG4gICAgICBpZihtdCA9PSA2KSB7XG4gICAgICAgIGRhdGFCdWZmZXIud3JpdGUoeyB0cywgZGF0YTogZGF0YS5yZWNvcmRzIH0pXG4gICAgICB9XG5cbiAgICAgIGZvcihsZXQgeyBwb3J0LCBzdWJzY3JpcHRpb25zIH0gb2YgcG9ydHMpIHtcbiAgICAgICAgaWYoc3Vic2NyaXB0aW9ucy5pbmNsdWRlcyh0eXBlKSkge1xuICAgICAgICAgIGlmKHBvcnQpIHtcbiAgICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB0cywgZGF0YSB9KVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3N0TWVzc2FnZSh7IHRzLCBkYXRhIH0pXG4gICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHBvc3RNZXNzYWdlKGRhdGEpXG4gICAgfSlcblxuICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIGUgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ1NvY2tldCBjb25uZWN0aW9uIGJyb2tlbiEgUmV0cnlpbmcgaW4gMXMuLi4nKVxuICAgICAgcG9zdE1lc3NhZ2UoJ2Rpc2Nvbm5lY3RlZCcpXG4gICAgICByZWFkeSA9IGZhbHNlXG4gICAgICBzb2NrZXQgPSBudWxsXG4gICAgICBjb25uZWN0ZWRDaGFubmVscyA9IFtdXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgY3JlYXRlU29ja2V0KClcbiAgICAgIH0sIDEwMDApXG4gICAgfSlcbiAgfVxuICBxdWV1ZS5wdXNoKHJlc29sdmUpXG59KVxuXG5jb25zdCBzZW5kID0gYXN5bmMgbXNnID0+IHtcbiAgYXdhaXQgY3JlYXRlU29ja2V0KClcbiAgY29uc29sZS5sb2coYHNlbmRpbmcgJHttc2d9YClcbiAgc29ja2V0LnNlbmQobXNnKVxufVxuXG5jb25zdCBjb25uZWN0ID0gYXN5bmMgKCkgPT4ge1xuICBsZXQgdG9Db25uZWN0ID0gYWN0aXZlQ2hhbm5lbHMuZmlsdGVyKHggPT4gIWNvbm5lY3RlZENoYW5uZWxzLmluY2x1ZGVzKHgpKVxuICBjb25uZWN0ZWRDaGFubmVscyA9IFsgLi4uYWN0aXZlQ2hhbm5lbHMgXVxuICBmb3IobGV0IGNoYW5uZWwgb2YgdG9Db25uZWN0KSB7XG4gICAgYXdhaXQgc2VuZChgKyR7Y2hhbm5lbH1gKVxuICB9XG59XG5cblxuLy8gREVQUkVDQVRFRDogbm8gVWludDhBcnJheXMgY3VycmVudGx5IGJlaW5nIHBhc3NlZFxuXG4vLyBmdW5jdGlvbiBnZXRTdHJpbmcoYXJyYXkpIHtcbi8vICAgdmFyIG91dCwgaSwgbGVuLCBjXG4vLyAgIHZhciBjaGFyMiwgY2hhcjNcblxuLy8gICBvdXQgPSBcIlwiXG4vLyAgIGxlbiA9IGFycmF5Lmxlbmd0aFxuLy8gICBpID0gMFxuLy8gICB3aGlsZSAoaSA8IGxlbikge1xuLy8gICAgIGMgPSBhcnJheVtpKytdXG4vLyAgICAgaWYgKGkgPiAwICYmIGMgPT09IDApIGJyZWFrXG4vLyAgICAgc3dpdGNoIChjID4+IDQpIHtcbi8vICAgICBjYXNlIDA6IGNhc2UgMTogY2FzZSAyOiBjYXNlIDM6IGNhc2UgNDogY2FzZSA1OiBjYXNlIDY6IGNhc2UgNzpcbi8vICAgICAgIC8vIDB4eHh4eHh4XG4vLyAgICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKVxuLy8gICAgICAgYnJlYWtcbi8vICAgICBjYXNlIDEyOiBjYXNlIDEzOlxuLy8gICAgICAgLy8gMTEweCB4eHh4ICAgMTB4eCB4eHh4XG4vLyAgICAgICBjaGFyMiA9IGFycmF5W2krK11cbi8vICAgICAgIG91dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMHgxRikgPDwgNiB8IGNoYXIyICYgMHgzRilcbi8vICAgICAgIGJyZWFrXG4vLyAgICAgY2FzZSAxNDpcbi8vICAgICAgIC8vIDExMTAgeHh4eCAgMTB4eCB4eHh4ICAxMHh4IHh4eHhcbi8vICAgICAgIGNoYXIyID0gYXJyYXlbaSsrXVxuLy8gICAgICAgY2hhcjMgPSBhcnJheVtpKytdXG4vLyAgICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyAmIDB4MEYpIDw8IDEyIHxcbi8vICAgICAgICAgICAoY2hhcjIgJiAweDNGKSA8PCA2IHxcbi8vICAgICAgICAgICAoY2hhcjMgJiAweDNGKSA8PCAwKVxuLy8gICAgICAgYnJlYWtcbi8vICAgICB9XG4vLyAgIH1cblxuLy8gICByZXR1cm4gb3V0XG4vLyB9XG5cblxuY29uc3QgaWQgPSAoKSA9PiB7XG4gIHJldHVybiAnXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSlcbn1cblxubGV0IGlkcyA9IHt9XG5cblxuXG5jb25zdCBwcm9jZXNzQ29tbWFuZCA9IGUgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc3RhcnQnKSB7XG4gICAgc29ja2V0VGFyZ2V0ID0gZGF0YS50YXJnZXRcbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ2Nvbm5lY3QnKSB7XG4gICAgYWRkUG9ydFN1YnNjcmlwdGlvbnMoZGF0YS5wb3J0LCBkYXRhLmNoYW5uZWxzKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnY2xvc2UnKSB7XG4gICAgaWYgKGRhdGEucG9ydCkge1xuICAgICAgcG9ydHMgPSBwb3J0cy5maWx0ZXIoeCA9PiB4LnBvcnQgIT0gcG9ydClcbiAgICB9XG4gIH1cbn1cblxub25tZXNzYWdlID0gZSA9PiB7XG4gIGNvbnN0IHsgZGF0YSB9ID0gZVxuICBpZihkYXRhLnBvcnQpIHtcbiAgICBjb25zdCBwb3J0ID0gZGF0YS5wb3J0XG4gICAgY29uc3QgY29ubmVjdGlvbklkID0gaWQoKVxuICAgIHBvcnQub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xuICAgICAgcHJvY2Vzc0NvbW1hbmQoZSlcbiAgICAgIGJ1ZmZlckNvbW1hbmRzKHBvcnQsIGUsIGNvbm5lY3Rpb25JZClcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzc0NvbW1hbmQoZSlcbiAgICBidWZmZXJDb21tYW5kcyhudWxsLCBlLCAnbWFpbicpXG4gIH1cbn1cblxuLy8gb25jb25uZWN0ID0gZnVuY3Rpb24oZSkge1xuXG4vLyAgIGNvbnN0IGNvbm5lY3Rpb25JZCA9IGlkKClcblxuLy8gICBjb25zdCBwb3J0ID0gZS5wb3J0c1swXVxuXG4vLyAgIHBvcnQub25tZXNzYWdlID0gYXN5bmMgZSA9PiB7XG4vLyAgICAgY29uc29sZS5sb2coZS5kYXRhKVxuLy8gICAgIGNvbnN0IHsgZGF0YSB9ID0gZVxuXG4vLyAgICAgaWYoZGF0YS5jb21tYW5kID09ICdzdGFydCcpIHtcbi8vICAgICAgIHNvY2tldFRhcmdldCA9IGRhdGEudGFyZ2V0XG4vLyAgICAgfVxuXG4vLyAgICAgaWYoZGF0YS5jb21tYW5kID09ICdjb25uZWN0Jykge1xuLy8gICAgICAgYWRkUG9ydFN1YnNjcmlwdGlvbnMocG9ydCwgZGF0YS5jaGFubmVscylcbi8vICAgICB9XG5cbi8vICAgICBpZihkYXRhLmNvbW1hbmQgPT0gJ2Nsb3NlJykge1xuLy8gICAgICAgcG9ydHMgPSBwb3J0cy5maWx0ZXIoeCA9PiB4LnBvcnQgIT0gcG9ydClcbi8vICAgICB9XG5cbi8vICAgICBidWZmZXJDb21tYW5kcyhwb3J0LCBlLCBjb25uZWN0aW9uSWQpXG4vLyAgIH1cbi8vIH1cbiJdLCJuYW1lcyI6WyJwYmYiLCJQYmYiXSwibWFwcGluZ3MiOiI7OztFQUFBO0VBQ0EsUUFBWSxHQUFHLFVB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LEdBQUcsSUFBSSxJQUFJLEVBQUM7RUFDdkIsRUFBRSxJQUFJLEVBQUUsSUFBSSxJQUFJLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDbEUsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUM7RUFDakMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBQztFQUN2QixFQUFFLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0FBQzdEO0VBQ0EsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUM7QUFDekI7RUFDQSxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxRQUFRLEVBQUU7RUFDMUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQzVCLElBQUksQ0FBQyxHQUFHLEtBQUk7RUFDWixHQUFHLE1BQU07RUFDVCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUM5QyxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQzNDLE1BQU0sQ0FBQyxHQUFFO0VBQ1QsTUFBTSxDQUFDLElBQUksRUFBQztFQUNaLEtBQUs7RUFDTCxJQUFJ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LFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDdEQsUUFBUSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQztBQUN0QztFQUNBLFFBQVEsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckU7RUFDQTtFQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0VBQ2hDLFFBQVEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUM5QixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDO0VBQ3hCLEtBQUs7QUFDTDtFQUNBLElBQUksVUFBVSxFQUFFLFNBQVMsR0FBRyxFQUFFO0VBQzlCLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN4QixRQUFRLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQzVELFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDdEIsS0FBSztBQUNMO0VBQ0EsSUFBSSxXQUFXLEVBQUUsU0FBUyxHQUFHLEVBQUU7RUFDL0IsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3hCLFFBQVEsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDNUQsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUN0QixLQUFLO0FBQ0w7RUFDQSxJQUFJLFVBQVUsRUFB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QUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLEVBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxPQUFPLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2pGLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLE9BQU8sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDakYsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEVBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNqRixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxPQUFPLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pGO0VB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QUFJLENBQUMsSUFBSSxFQUFFLE9BQU87RUFDdEYsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTztFQUN0RixJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztFQUN0QyxDQUFDO0FBQ0Q7RUFDQSxTQUFTLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ3BELElBQUksSUFBSSxRQUFRO0VBQ2hCLFFBQVEsR0FBRyxJQUFJLE1BQU0sR0FBRyxDQUFDO0VBQ3pCLFFBQVEsR0FBRyxJQUFJLFFBQVEsR0FBRyxDQUFDO0VBQzNCLFFBQVEsR0FBRyxJQUFJLFNBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRTtFQUNBO0VBQ0EsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzFCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDckYsQ0FBQztBQUNEO0VBQ0EsU0FBUyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0VBQzFHLFNBQVMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUMxRyxTQUFTLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7RUFDMUcsU0FBUyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0VBQzFHLFNBQVMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUMxRyxTQUFTLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1B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QUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzdDLFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzlELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQy9ELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzlELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQy9ELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO0VBQ3ZELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO0VBQ3hELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO0VBQ3ZELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO0VBQ3hELENBQUMsQ0FBQztFQUNGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ3BDLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2hELElBQUksSUFBSSxHQUFHLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0VBQ3hFLElBQUksSUFBSSxHQUFHLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0VBQzFFLElBQUksSUFBSSxHQUFHLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0VBQ3hFLElBQUksSUFBSSxHQUFHLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0VBQzFFLElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUMzRCxJQUFJLElBQUksR0FBRyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7RUFDN0QsSUFBSSxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzNELElBQUksSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztFQUM3RCxDQUFDLENBQUM7QUFDRjtFQUNBO0FBQ0E7RUFDTyxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFDO0FBQzFDO0VBQ0EsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDbEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQ3JHLENBQUMsQ0FBQztFQUNGLE1BQU0sQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUM3QyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUM3QyxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUN4RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUN4RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDdkQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3ZELENBQUMsQ0FBQztFQUNGLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ25DLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2hELElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzVELElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzVELElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ2xELElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ2xELENBQUMsQ0FBQztBQUNGO0VBQ0E7QUFDQTtFQUNPLE1BQU0sT0FBTyxHQUFxQixFQUFFLENBQUM7QUFDNUM7RUFDQSxPQUFPLENBQUMsSUFBSSxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNuQyxJQUFJLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDbE0sQ0FBQyxDQUFDO0VBQ0YsT0FBTyxDQUFDLFVBQVUsR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQzlDLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzdDLFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQ3JELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzVELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM1RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDMUQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzdELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM1RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDOUQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUM7RUFDdEYsU0FBUyxJQUFJLEdBQUcsS0FBSyxFQUFFLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDO0VBQ2xHLENBQUMsQ0FBQztFQUNGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ3BDLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2hELElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ3RELElBQUksSUFBSSxHQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0VBQ3BFLElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzVELElBQUksSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQ3hELElBQUksSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzlELElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzVELElBQUksSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0VBQ2hFLElBQUksSUFBSSxHQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0VBQ3BFLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzlELENBQUMsQ0FBQztBQUNGO0VBQ0E7QUFDQTtFQUNPLE1BQU0sS0FBSyxHQUFtQixFQUFFLENBQUM7QUFDeEM7RUFDQSxLQUFLLENBQUMsSUFBSSxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNqQyxJQUFJLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDNUUsQ0FBQyxDQUFDO0VBQ0YsS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQzVDLElBQUksSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNyRCxTQUFTLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUM1RCxDQUFDLENBQUM7RUFDRixLQUFLLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNsQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN0RCxJQUFJLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztFQUNsRSxDQUFDLENBQUM7QUFDRjtFQUNBO0FBQ0E7RUFDTyxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFDO0FBQzFDO0VBQ0EsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDbEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztFQUNqRyxDQUFDLENBQUM7RUFDRixNQUFNLENBQUMsVUFBVSxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDN0MsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDN0MsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzVELFNBQVMsSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUMxRCxTQUFTLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUM1RCxDQUFDLENBQUM7RUFDRixNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNuQyxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNoRCxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUM1RCxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMs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TUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ3JCLFFBQVEsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDNUQsUUFBUSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUM7RUFDdkcsUUFBUSxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBQztFQUM5QyxRQUFRLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtFQUMzQixVQUFVLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBQztFQUN2RCxVQUFVLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUM7RUFDdEMsVUFBVSxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLEtBQUk7RUFDdkMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsS0FBSTtFQUMzRSxVQUFVLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBQztFQUNsQyxTQUFTO0VBQ1QsT0FBTztFQUNQO0VBQ0EsTUFBSztBQUNMO0VBQ0EsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUM7RUFDL0MsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksaUJBQWlCLEVBQUU7RUFDekMsSUFBSSxJQUFJLEtBQUssR0FBRyxNQUFLO0VBQ3JCLElBQUks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
