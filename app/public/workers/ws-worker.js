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
      console.log('setting params', data.params);
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

  const messageTypes = { tcdata, minmax, unknown_msg, tczone, sysinfo, mdtmsg };

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
          7: 'mdtmsg'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3Mtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wYmYvaW5kZXguanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS9kZWNvZGUucHJvdG8uanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS93cy13b3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohIGllZWU3NTQuIEJTRC0zLUNsYXVzZSBMaWNlbnNlLiBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmcvb3BlbnNvdXJjZT4gKi9cbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gKGUgKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gKG0gKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAoKHZhbHVlICogYykgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBQYmY7XG5cbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpO1xuXG5mdW5jdGlvbiBQYmYoYnVmKSB7XG4gICAgdGhpcy5idWYgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgJiYgQXJyYXlCdWZmZXIuaXNWaWV3KGJ1ZikgPyBidWYgOiBuZXcgVWludDhBcnJheShidWYgfHwgMCk7XG4gICAgdGhpcy5wb3MgPSAwO1xuICAgIHRoaXMudHlwZSA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLmJ1Zi5sZW5ndGg7XG59XG5cblBiZi5WYXJpbnQgID0gMDsgLy8gdmFyaW50OiBpbnQzMiwgaW50NjQsIHVpbnQzMiwgdWludDY0LCBzaW50MzIsIHNpbnQ2NCwgYm9vbCwgZW51bVxuUGJmLkZpeGVkNjQgPSAxOyAvLyA2NC1iaXQ6IGRvdWJsZSwgZml4ZWQ2NCwgc2ZpeGVkNjRcblBiZi5CeXRlcyAgID0gMjsgLy8gbGVuZ3RoLWRlbGltaXRlZDogc3RyaW5nLCBieXRlcywgZW1iZWRkZWQgbWVzc2FnZXMsIHBhY2tlZCByZXBlYXRlZCBmaWVsZHNcblBiZi5GaXhlZDMyID0gNTsgLy8gMzItYml0OiBmbG9hdCwgZml4ZWQzMiwgc2ZpeGVkMzJcblxudmFyIFNISUZUX0xFRlRfMzIgPSAoMSA8PCAxNikgKiAoMSA8PCAxNiksXG4gICAgU0hJRlRfUklHSFRfMzIgPSAxIC8gU0hJRlRfTEVGVF8zMjtcblxuLy8gVGhyZXNob2xkIGNob3NlbiBiYXNlZCBvbiBib3RoIGJlbmNobWFya2luZyBhbmQga25vd2xlZGdlIGFib3V0IGJyb3dzZXIgc3RyaW5nXG4vLyBkYXRhIHN0cnVjdHVyZXMgKHdoaWNoIGN1cnJlbnRseSBzd2l0Y2ggc3RydWN0dXJlIHR5cGVzIGF0IDEyIGJ5dGVzIG9yIG1vcmUpXG52YXIgVEVYVF9ERUNPREVSX01JTl9MRU5HVEggPSAxMjtcbnZhciB1dGY4VGV4dERlY29kZXIgPSB0eXBlb2YgVGV4dERlY29kZXIgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IG5ldyBUZXh0RGVjb2RlcigndXRmOCcpO1xuXG5QYmYucHJvdG90eXBlID0ge1xuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuYnVmID0gbnVsbDtcbiAgICB9LFxuXG4gICAgLy8gPT09IFJFQURJTkcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIHJlYWRGaWVsZHM6IGZ1bmN0aW9uKHJlYWRGaWVsZCwgcmVzdWx0LCBlbmQpIHtcbiAgICAgICAgZW5kID0gZW5kIHx8IHRoaXMubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgdmFyIHZhbCA9IHRoaXMucmVhZFZhcmludCgpLFxuICAgICAgICAgICAgICAgIHRhZyA9IHZhbCA+PiAzLFxuICAgICAgICAgICAgICAgIHN0YXJ0UG9zID0gdGhpcy5wb3M7XG5cbiAgICAgICAgICAgIHRoaXMudHlwZSA9IHZhbCAmIDB4NztcbiAgICAgICAgICAgIHJlYWRGaWVsZCh0YWcsIHJlc3VsdCwgdGhpcyk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA9PT0gc3RhcnRQb3MpIHRoaXMuc2tpcCh2YWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIHJlYWRNZXNzYWdlOiBmdW5jdGlvbihyZWFkRmllbGQsIHJlc3VsdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkRmllbGRzKHJlYWRGaWVsZCwgcmVzdWx0LCB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zKTtcbiAgICB9LFxuXG4gICAgcmVhZEZpeGVkMzI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gcmVhZFVJbnQzMih0aGlzLmJ1ZiwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkU0ZpeGVkMzI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gcmVhZEludDMyKHRoaXMuYnVmLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIC8vIDY0LWJpdCBpbnQgaGFuZGxpbmcgaXMgYmFzZWQgb24gZ2l0aHViLmNvbS9kcHcvbm9kZS1idWZmZXItbW9yZS1pbnRzIChNSVQtbGljZW5zZWQpXG5cbiAgICByZWFkRml4ZWQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSByZWFkVUludDMyKHRoaXMuYnVmLCB0aGlzLnBvcykgKyByZWFkVUludDMyKHRoaXMuYnVmLCB0aGlzLnBvcyArIDQpICogU0hJRlRfTEVGVF8zMjtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9LFxuXG4gICAgcmVhZFNGaXhlZDY0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbCA9IHJlYWRVSW50MzIodGhpcy5idWYsIHRoaXMucG9zKSArIHJlYWRJbnQzMih0aGlzLmJ1ZiwgdGhpcy5wb3MgKyA0KSAqIFNISUZUX0xFRlRfMzI7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWRGbG9hdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSBpZWVlNzU0LnJlYWQodGhpcy5idWYsIHRoaXMucG9zLCB0cnVlLCAyMywgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWREb3VibGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gaWVlZTc1NC5yZWFkKHRoaXMuYnVmLCB0aGlzLnBvcywgdHJ1ZSwgNTIsIDgpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkVmFyaW50OiBmdW5jdGlvbihpc1NpZ25lZCkge1xuICAgICAgICB2YXIgYnVmID0gdGhpcy5idWYsXG4gICAgICAgICAgICB2YWwsIGI7XG5cbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICA9ICBiICYgMHg3ZjsgICAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgNzsgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgMTQ7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgMjE7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvc107ICAgdmFsIHw9IChiICYgMHgwZikgPDwgMjg7XG5cbiAgICAgICAgcmV0dXJuIHJlYWRWYXJpbnRSZW1haW5kZXIodmFsLCBpc1NpZ25lZCwgdGhpcyk7XG4gICAgfSxcblxuICAgIHJlYWRWYXJpbnQ2NDogZnVuY3Rpb24oKSB7IC8vIGZvciBjb21wYXRpYmlsaXR5IHdpdGggdjIuMC4xXG4gICAgICAgIHJldHVybiB0aGlzLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgfSxcblxuICAgIHJlYWRTVmFyaW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG51bSA9IHRoaXMucmVhZFZhcmludCgpO1xuICAgICAgICByZXR1cm4gbnVtICUgMiA9PT0gMSA/IChudW0gKyAxKSAvIC0yIDogbnVtIC8gMjsgLy8gemlnemFnIGVuY29kaW5nXG4gICAgfSxcblxuICAgIHJlYWRCb29sZWFuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4odGhpcy5yZWFkVmFyaW50KCkpO1xuICAgIH0sXG5cbiAgICByZWFkU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3M7XG4gICAgICAgIHZhciBwb3MgPSB0aGlzLnBvcztcbiAgICAgICAgdGhpcy5wb3MgPSBlbmQ7XG5cbiAgICAgICAgaWYgKGVuZCAtIHBvcyA+PSBURVhUX0RFQ09ERVJfTUlOX0xFTkdUSCAmJiB1dGY4VGV4dERlY29kZXIpIHtcbiAgICAgICAgICAgIC8vIGxvbmdlciBzdHJpbmdzIGFyZSBmYXN0IHdpdGggdGhlIGJ1aWx0LWluIGJyb3dzZXIgVGV4dERlY29kZXIgQVBJXG4gICAgICAgICAgICByZXR1cm4gcmVhZFV0ZjhUZXh0RGVjb2Rlcih0aGlzLmJ1ZiwgcG9zLCBlbmQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNob3J0IHN0cmluZ3MgYXJlIGZhc3Qgd2l0aCBvdXIgY3VzdG9tIGltcGxlbWVudGF0aW9uXG4gICAgICAgIHJldHVybiByZWFkVXRmOCh0aGlzLmJ1ZiwgcG9zLCBlbmQpO1xuICAgIH0sXG5cbiAgICByZWFkQnl0ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcyxcbiAgICAgICAgICAgIGJ1ZmZlciA9IHRoaXMuYnVmLnN1YmFycmF5KHRoaXMucG9zLCBlbmQpO1xuICAgICAgICB0aGlzLnBvcyA9IGVuZDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9LFxuXG4gICAgLy8gdmVyYm9zZSBmb3IgcGVyZm9ybWFuY2UgcmVhc29uczsgZG9lc24ndCBhZmZlY3QgZ3ppcHBlZCBzaXplXG5cbiAgICByZWFkUGFja2VkVmFyaW50OiBmdW5jdGlvbihhcnIsIGlzU2lnbmVkKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZFZhcmludChpc1NpZ25lZCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFZhcmludChpc1NpZ25lZCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZFNWYXJpbnQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRTVmFyaW50KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFNWYXJpbnQoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkQm9vbGVhbjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEJvb2xlYW4oKSk7XG4gICAgICAgIHZhciBlbmQgPSByZWFkUGFja2VkRW5kKHRoaXMpO1xuICAgICAgICBhcnIgPSBhcnIgfHwgW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkQm9vbGVhbigpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRGbG9hdDogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEZsb2F0KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEZsb2F0KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZERvdWJsZTogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZERvdWJsZSgpKTtcbiAgICAgICAgdmFyIGVuZCA9IHJlYWRQYWNrZWRFbmQodGhpcyk7XG4gICAgICAgIGFyciA9IGFyciB8fCBbXTtcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zIDwgZW5kKSBhcnIucHVzaCh0aGlzLnJlYWREb3VibGUoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRml4ZWQzMjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEZpeGVkMzIoKSk7XG4gICAgICAgIHZhciBlbmQgPSByZWFkUGFja2VkRW5kKHRoaXMpO1xuICAgICAgICBhcnIgPSBhcnIgfHwgW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkRml4ZWQzMigpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRTRml4ZWQzMjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZFNGaXhlZDMyKCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFNGaXhlZDMyKCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZEZpeGVkNjQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRGaXhlZDY0KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEZpeGVkNjQoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkU0ZpeGVkNjQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRTRml4ZWQ2NCgpKTtcbiAgICAgICAgdmFyIGVuZCA9IHJlYWRQYWNrZWRFbmQodGhpcyk7XG4gICAgICAgIGFyciA9IGFyciB8fCBbXTtcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zIDwgZW5kKSBhcnIucHVzaCh0aGlzLnJlYWRTRml4ZWQ2NCgpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuXG4gICAgc2tpcDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHZhciB0eXBlID0gdmFsICYgMHg3O1xuICAgICAgICBpZiAodHlwZSA9PT0gUGJmLlZhcmludCkgd2hpbGUgKHRoaXMuYnVmW3RoaXMucG9zKytdID4gMHg3Zikge31cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gUGJmLkJ5dGVzKSB0aGlzLnBvcyA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3M7XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFBiZi5GaXhlZDMyKSB0aGlzLnBvcyArPSA0O1xuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBQYmYuRml4ZWQ2NCkgdGhpcy5wb3MgKz0gODtcbiAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ1VuaW1wbGVtZW50ZWQgdHlwZTogJyArIHR5cGUpO1xuICAgIH0sXG5cbiAgICAvLyA9PT0gV1JJVElORyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgd3JpdGVUYWc6IGZ1bmN0aW9uKHRhZywgdHlwZSkge1xuICAgICAgICB0aGlzLndyaXRlVmFyaW50KCh0YWcgPDwgMykgfCB0eXBlKTtcbiAgICB9LFxuXG4gICAgcmVhbGxvYzogZnVuY3Rpb24obWluKSB7XG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAxNjtcblxuICAgICAgICB3aGlsZSAobGVuZ3RoIDwgdGhpcy5wb3MgKyBtaW4pIGxlbmd0aCAqPSAyO1xuXG4gICAgICAgIGlmIChsZW5ndGggIT09IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgIGJ1Zi5zZXQodGhpcy5idWYpO1xuICAgICAgICAgICAgdGhpcy5idWYgPSBidWY7XG4gICAgICAgICAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBmaW5pc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHRoaXMucG9zO1xuICAgICAgICB0aGlzLnBvcyA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1Zi5zdWJhcnJheSgwLCB0aGlzLmxlbmd0aCk7XG4gICAgfSxcblxuICAgIHdyaXRlRml4ZWQzMjogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg0KTtcbiAgICAgICAgd3JpdGVJbnQzMih0aGlzLmJ1ZiwgdmFsLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfSxcblxuICAgIHdyaXRlU0ZpeGVkMzI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLnJlYWxsb2MoNCk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIHZhbCwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH0sXG5cbiAgICB3cml0ZUZpeGVkNjQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLnJlYWxsb2MoOCk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIHZhbCAmIC0xLCB0aGlzLnBvcyk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIE1hdGguZmxvb3IodmFsICogU0hJRlRfUklHSFRfMzIpLCB0aGlzLnBvcyArIDQpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgIH0sXG5cbiAgICB3cml0ZVNGaXhlZDY0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDgpO1xuICAgICAgICB3cml0ZUludDMyKHRoaXMuYnVmLCB2YWwgJiAtMSwgdGhpcy5wb3MpO1xuICAgICAgICB3cml0ZUludDMyKHRoaXMuYnVmLCBNYXRoLmZsb29yKHZhbCAqIFNISUZUX1JJR0hUXzMyKSwgdGhpcy5wb3MgKyA0KTtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICB9LFxuXG4gICAgd3JpdGVWYXJpbnQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB2YWwgPSArdmFsIHx8IDA7XG5cbiAgICAgICAgaWYgKHZhbCA+IDB4ZmZmZmZmZiB8fCB2YWwgPCAwKSB7XG4gICAgICAgICAgICB3cml0ZUJpZ1ZhcmludCh2YWwsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuXG4gICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gICAgICAgICAgIHZhbCAmIDB4N2YgIHwgKHZhbCA+IDB4N2YgPyAweDgwIDogMCk7IGlmICh2YWwgPD0gMHg3ZikgcmV0dXJuO1xuICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+Pj0gNykgJiAweDdmKSB8ICh2YWwgPiAweDdmID8gMHg4MCA6IDApOyBpZiAodmFsIDw9IDB4N2YpIHJldHVybjtcbiAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj49IDcpICYgMHg3ZikgfCAodmFsID4gMHg3ZiA/IDB4ODAgOiAwKTsgaWYgKHZhbCA8PSAweDdmKSByZXR1cm47XG4gICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gICAodmFsID4+PiA3KSAmIDB4N2Y7XG4gICAgfSxcblxuICAgIHdyaXRlU1ZhcmludDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQodmFsIDwgMCA/IC12YWwgKiAyIC0gMSA6IHZhbCAqIDIpO1xuICAgIH0sXG5cbiAgICB3cml0ZUJvb2xlYW46IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVmFyaW50KEJvb2xlYW4odmFsKSk7XG4gICAgfSxcblxuICAgIHdyaXRlU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgc3RyID0gU3RyaW5nKHN0cik7XG4gICAgICAgIHRoaXMucmVhbGxvYyhzdHIubGVuZ3RoICogNCk7XG5cbiAgICAgICAgdGhpcy5wb3MrKzsgLy8gcmVzZXJ2ZSAxIGJ5dGUgZm9yIHNob3J0IHN0cmluZyBsZW5ndGhcblxuICAgICAgICB2YXIgc3RhcnRQb3MgPSB0aGlzLnBvcztcbiAgICAgICAgLy8gd3JpdGUgdGhlIHN0cmluZyBkaXJlY3RseSB0byB0aGUgYnVmZmVyIGFuZCBzZWUgaG93IG11Y2ggd2FzIHdyaXR0ZW5cbiAgICAgICAgdGhpcy5wb3MgPSB3cml0ZVV0ZjgodGhpcy5idWYsIHN0ciwgdGhpcy5wb3MpO1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5wb3MgLSBzdGFydFBvcztcblxuICAgICAgICBpZiAobGVuID49IDB4ODApIG1ha2VSb29tRm9yRXh0cmFMZW5ndGgoc3RhcnRQb3MsIGxlbiwgdGhpcyk7XG5cbiAgICAgICAgLy8gZmluYWxseSwgd3JpdGUgdGhlIG1lc3NhZ2UgbGVuZ3RoIGluIHRoZSByZXNlcnZlZCBwbGFjZSBhbmQgcmVzdG9yZSB0aGUgcG9zaXRpb25cbiAgICAgICAgdGhpcy5wb3MgPSBzdGFydFBvcyAtIDE7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQobGVuKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gbGVuO1xuICAgIH0sXG5cbiAgICB3cml0ZUZsb2F0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuICAgICAgICBpZWVlNzU0LndyaXRlKHRoaXMuYnVmLCB2YWwsIHRoaXMucG9zLCB0cnVlLCAyMywgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfSxcblxuICAgIHdyaXRlRG91YmxlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDgpO1xuICAgICAgICBpZWVlNzU0LndyaXRlKHRoaXMuYnVmLCB2YWwsIHRoaXMucG9zLCB0cnVlLCA1MiwgOCk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfSxcblxuICAgIHdyaXRlQnl0ZXM6IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICB2YXIgbGVuID0gYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChsZW4pO1xuICAgICAgICB0aGlzLnJlYWxsb2MobGVuKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgdGhpcy5idWZbdGhpcy5wb3MrK10gPSBidWZmZXJbaV07XG4gICAgfSxcblxuICAgIHdyaXRlUmF3TWVzc2FnZTogZnVuY3Rpb24oZm4sIG9iaikge1xuICAgICAgICB0aGlzLnBvcysrOyAvLyByZXNlcnZlIDEgYnl0ZSBmb3Igc2hvcnQgbWVzc2FnZSBsZW5ndGhcblxuICAgICAgICAvLyB3cml0ZSB0aGUgbWVzc2FnZSBkaXJlY3RseSB0byB0aGUgYnVmZmVyIGFuZCBzZWUgaG93IG11Y2ggd2FzIHdyaXR0ZW5cbiAgICAgICAgdmFyIHN0YXJ0UG9zID0gdGhpcy5wb3M7XG4gICAgICAgIGZuKG9iaiwgdGhpcyk7XG4gICAgICAgIHZhciBsZW4gPSB0aGlzLnBvcyAtIHN0YXJ0UG9zO1xuXG4gICAgICAgIGlmIChsZW4gPj0gMHg4MCkgbWFrZVJvb21Gb3JFeHRyYUxlbmd0aChzdGFydFBvcywgbGVuLCB0aGlzKTtcblxuICAgICAgICAvLyBmaW5hbGx5LCB3cml0ZSB0aGUgbWVzc2FnZSBsZW5ndGggaW4gdGhlIHJlc2VydmVkIHBsYWNlIGFuZCByZXN0b3JlIHRoZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0UG9zIC0gMTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChsZW4pO1xuICAgICAgICB0aGlzLnBvcyArPSBsZW47XG4gICAgfSxcblxuICAgIHdyaXRlTWVzc2FnZTogZnVuY3Rpb24odGFnLCBmbiwgb2JqKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlUmF3TWVzc2FnZShmbiwgb2JqKTtcbiAgICB9LFxuXG4gICAgd3JpdGVQYWNrZWRWYXJpbnQ6ICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRWYXJpbnQsIGFycik7ICAgfSxcbiAgICB3cml0ZVBhY2tlZFNWYXJpbnQ6ICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZFNWYXJpbnQsIGFycik7ICB9LFxuICAgIHdyaXRlUGFja2VkQm9vbGVhbjogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkQm9vbGVhbiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRGbG9hdDogICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRGbG9hdCwgYXJyKTsgICAgfSxcbiAgICB3cml0ZVBhY2tlZERvdWJsZTogICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZERvdWJsZSwgYXJyKTsgICB9LFxuICAgIHdyaXRlUGFja2VkRml4ZWQzMjogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkRml4ZWQzMiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRTRml4ZWQzMjogZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRTRml4ZWQzMiwgYXJyKTsgfSxcbiAgICB3cml0ZVBhY2tlZEZpeGVkNjQ6ICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZEZpeGVkNjQsIGFycik7ICB9LFxuICAgIHdyaXRlUGFja2VkU0ZpeGVkNjQ6IGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkU0ZpeGVkNjQsIGFycik7IH0sXG5cbiAgICB3cml0ZUJ5dGVzRmllbGQ6IGZ1bmN0aW9uKHRhZywgYnVmZmVyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlQnl0ZXMoYnVmZmVyKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQzMih2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkMzIodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQ2NCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkNjQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVNWYXJpbnQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlU3RyaW5nRmllbGQ6IGZ1bmN0aW9uKHRhZywgc3RyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlU3RyaW5nKHN0cik7XG4gICAgfSxcbiAgICB3cml0ZUZsb2F0RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuRml4ZWQzMik7XG4gICAgICAgIHRoaXMud3JpdGVGbG9hdCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVEb3VibGVGaWVsZDogZnVuY3Rpb24odGFnLCB2YWwpIHtcbiAgICAgICAgdGhpcy53cml0ZVRhZyh0YWcsIFBiZi5GaXhlZDY0KTtcbiAgICAgICAgdGhpcy53cml0ZURvdWJsZSh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVCb29sZWFuRmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnRGaWVsZCh0YWcsIEJvb2xlYW4odmFsKSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gcmVhZFZhcmludFJlbWFpbmRlcihsLCBzLCBwKSB7XG4gICAgdmFyIGJ1ZiA9IHAuYnVmLFxuICAgICAgICBoLCBiO1xuXG4gICAgYiA9IGJ1ZltwLnBvcysrXTsgaCAgPSAoYiAmIDB4NzApID4+IDQ7ICBpZiAoYiA8IDB4ODApIHJldHVybiB0b051bShsLCBoLCBzKTtcbiAgICBiID0gYnVmW3AucG9zKytdOyBoIHw9IChiICYgMHg3ZikgPDwgMzsgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHRvTnVtKGwsIGgsIHMpO1xuICAgIGIgPSBidWZbcC5wb3MrK107IGggfD0gKGIgJiAweDdmKSA8PCAxMDsgaWYgKGIgPCAweDgwKSByZXR1cm4gdG9OdW0obCwgaCwgcyk7XG4gICAgYiA9IGJ1ZltwLnBvcysrXTsgaCB8PSAoYiAmIDB4N2YpIDw8IDE3OyBpZiAoYiA8IDB4ODApIHJldHVybiB0b051bShsLCBoLCBzKTtcbiAgICBiID0gYnVmW3AucG9zKytdOyBoIHw9IChiICYgMHg3ZikgPDwgMjQ7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHRvTnVtKGwsIGgsIHMpO1xuICAgIGIgPSBidWZbcC5wb3MrK107IGggfD0gKGIgJiAweDAxKSA8PCAzMTsgaWYgKGIgPCAweDgwKSByZXR1cm4gdG9OdW0obCwgaCwgcyk7XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHZhcmludCBub3QgbW9yZSB0aGFuIDEwIGJ5dGVzJyk7XG59XG5cbmZ1bmN0aW9uIHJlYWRQYWNrZWRFbmQocGJmKSB7XG4gICAgcmV0dXJuIHBiZi50eXBlID09PSBQYmYuQnl0ZXMgP1xuICAgICAgICBwYmYucmVhZFZhcmludCgpICsgcGJmLnBvcyA6IHBiZi5wb3MgKyAxO1xufVxuXG5mdW5jdGlvbiB0b051bShsb3csIGhpZ2gsIGlzU2lnbmVkKSB7XG4gICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgIHJldHVybiBoaWdoICogMHgxMDAwMDAwMDAgKyAobG93ID4+PiAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKChoaWdoID4+PiAwKSAqIDB4MTAwMDAwMDAwKSArIChsb3cgPj4+IDApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJpZ1ZhcmludCh2YWwsIHBiZikge1xuICAgIHZhciBsb3csIGhpZ2g7XG5cbiAgICBpZiAodmFsID49IDApIHtcbiAgICAgICAgbG93ICA9ICh2YWwgJSAweDEwMDAwMDAwMCkgfCAwO1xuICAgICAgICBoaWdoID0gKHZhbCAvIDB4MTAwMDAwMDAwKSB8IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG93ICA9IH4oLXZhbCAlIDB4MTAwMDAwMDAwKTtcbiAgICAgICAgaGlnaCA9IH4oLXZhbCAvIDB4MTAwMDAwMDAwKTtcblxuICAgICAgICBpZiAobG93IF4gMHhmZmZmZmZmZikge1xuICAgICAgICAgICAgbG93ID0gKGxvdyArIDEpIHwgMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvdyA9IDA7XG4gICAgICAgICAgICBoaWdoID0gKGhpZ2ggKyAxKSB8IDA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFsID49IDB4MTAwMDAwMDAwMDAwMDAwMDAgfHwgdmFsIDwgLTB4MTAwMDAwMDAwMDAwMDAwMDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdHaXZlbiB2YXJpbnQgZG9lc25cXCd0IGZpdCBpbnRvIDEwIGJ5dGVzJyk7XG4gICAgfVxuXG4gICAgcGJmLnJlYWxsb2MoMTApO1xuXG4gICAgd3JpdGVCaWdWYXJpbnRMb3cobG93LCBoaWdoLCBwYmYpO1xuICAgIHdyaXRlQmlnVmFyaW50SGlnaChoaWdoLCBwYmYpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJpZ1ZhcmludExvdyhsb3csIGhpZ2gsIHBiZikge1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvc10gICA9IGxvdyAmIDB4N2Y7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmlnVmFyaW50SGlnaChoaWdoLCBwYmYpIHtcbiAgICB2YXIgbHNiID0gKGhpZ2ggJiAweDA3KSA8PCA0O1xuXG4gICAgcGJmLmJ1ZltwYmYucG9zKytdIHw9IGxzYiAgICAgICAgIHwgKChoaWdoID4+Pj0gMykgPyAweDgwIDogMCk7IGlmICghaGlnaCkgcmV0dXJuO1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSAgPSBoaWdoICYgMHg3ZiB8ICgoaGlnaCA+Pj49IDcpID8gMHg4MCA6IDApOyBpZiAoIWhpZ2gpIHJldHVybjtcbiAgICBwYmYuYnVmW3BiZi5wb3MrK10gID0gaGlnaCAmIDB4N2YgfCAoKGhpZ2ggPj4+PSA3KSA/IDB4ODAgOiAwKTsgaWYgKCFoaWdoKSByZXR1cm47XG4gICAgcGJmLmJ1ZltwYmYucG9zKytdICA9IGhpZ2ggJiAweDdmIHwgKChoaWdoID4+Pj0gNykgPyAweDgwIDogMCk7IGlmICghaGlnaCkgcmV0dXJuO1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSAgPSBoaWdoICYgMHg3ZiB8ICgoaGlnaCA+Pj49IDcpID8gMHg4MCA6IDApOyBpZiAoIWhpZ2gpIHJldHVybjtcbiAgICBwYmYuYnVmW3BiZi5wb3MrK10gID0gaGlnaCAmIDB4N2Y7XG59XG5cbmZ1bmN0aW9uIG1ha2VSb29tRm9yRXh0cmFMZW5ndGgoc3RhcnRQb3MsIGxlbiwgcGJmKSB7XG4gICAgdmFyIGV4dHJhTGVuID1cbiAgICAgICAgbGVuIDw9IDB4M2ZmZiA/IDEgOlxuICAgICAgICBsZW4gPD0gMHgxZmZmZmYgPyAyIDpcbiAgICAgICAgbGVuIDw9IDB4ZmZmZmZmZiA/IDMgOiBNYXRoLmZsb29yKE1hdGgubG9nKGxlbikgLyAoTWF0aC5MTjIgKiA3KSk7XG5cbiAgICAvLyBpZiAxIGJ5dGUgaXNuJ3QgZW5vdWdoIGZvciBlbmNvZGluZyBtZXNzYWdlIGxlbmd0aCwgc2hpZnQgdGhlIGRhdGEgdG8gdGhlIHJpZ2h0XG4gICAgcGJmLnJlYWxsb2MoZXh0cmFMZW4pO1xuICAgIGZvciAodmFyIGkgPSBwYmYucG9zIC0gMTsgaSA+PSBzdGFydFBvczsgaS0tKSBwYmYuYnVmW2kgKyBleHRyYUxlbl0gPSBwYmYuYnVmW2ldO1xufVxuXG5mdW5jdGlvbiB3cml0ZVBhY2tlZFZhcmludChhcnIsIHBiZikgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVWYXJpbnQoYXJyW2ldKTsgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNWYXJpbnQoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTVmFyaW50KGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZsb2F0KGFyciwgcGJmKSAgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGbG9hdChhcnJbaV0pOyAgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZERvdWJsZShhcnIsIHBiZikgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVEb3VibGUoYXJyW2ldKTsgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEJvb2xlYW4oYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVCb29sZWFuKGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZpeGVkMzIoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGaXhlZDMyKGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNGaXhlZDMyKGFyciwgcGJmKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTRml4ZWQzMihhcnJbaV0pOyB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZpeGVkNjQoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGaXhlZDY0KGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNGaXhlZDY0KGFyciwgcGJmKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTRml4ZWQ2NChhcnJbaV0pOyB9XG5cbi8vIEJ1ZmZlciBjb2RlIGJlbG93IGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIsIE1JVC1saWNlbnNlZFxuXG5mdW5jdGlvbiByZWFkVUludDMyKGJ1ZiwgcG9zKSB7XG4gICAgcmV0dXJuICgoYnVmW3Bvc10pIHxcbiAgICAgICAgKGJ1Zltwb3MgKyAxXSA8PCA4KSB8XG4gICAgICAgIChidWZbcG9zICsgMl0gPDwgMTYpKSArXG4gICAgICAgIChidWZbcG9zICsgM10gKiAweDEwMDAwMDApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUludDMyKGJ1ZiwgdmFsLCBwb3MpIHtcbiAgICBidWZbcG9zXSA9IHZhbDtcbiAgICBidWZbcG9zICsgMV0gPSAodmFsID4+PiA4KTtcbiAgICBidWZbcG9zICsgMl0gPSAodmFsID4+PiAxNik7XG4gICAgYnVmW3BvcyArIDNdID0gKHZhbCA+Pj4gMjQpO1xufVxuXG5mdW5jdGlvbiByZWFkSW50MzIoYnVmLCBwb3MpIHtcbiAgICByZXR1cm4gKChidWZbcG9zXSkgfFxuICAgICAgICAoYnVmW3BvcyArIDFdIDw8IDgpIHxcbiAgICAgICAgKGJ1Zltwb3MgKyAyXSA8PCAxNikpICtcbiAgICAgICAgKGJ1Zltwb3MgKyAzXSA8PCAyNCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRVdGY4KGJ1ZiwgcG9zLCBlbmQpIHtcbiAgICB2YXIgc3RyID0gJyc7XG4gICAgdmFyIGkgPSBwb3M7XG5cbiAgICB3aGlsZSAoaSA8IGVuZCkge1xuICAgICAgICB2YXIgYjAgPSBidWZbaV07XG4gICAgICAgIHZhciBjID0gbnVsbDsgLy8gY29kZXBvaW50XG4gICAgICAgIHZhciBieXRlc1BlclNlcXVlbmNlID1cbiAgICAgICAgICAgIGIwID4gMHhFRiA/IDQgOlxuICAgICAgICAgICAgYjAgPiAweERGID8gMyA6XG4gICAgICAgICAgICBiMCA+IDB4QkYgPyAyIDogMTtcblxuICAgICAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPiBlbmQpIGJyZWFrO1xuXG4gICAgICAgIHZhciBiMSwgYjIsIGIzO1xuXG4gICAgICAgIGlmIChieXRlc1BlclNlcXVlbmNlID09PSAxKSB7XG4gICAgICAgICAgICBpZiAoYjAgPCAweDgwKSB7XG4gICAgICAgICAgICAgICAgYyA9IGIwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGJ5dGVzUGVyU2VxdWVuY2UgPT09IDIpIHtcbiAgICAgICAgICAgIGIxID0gYnVmW2kgKyAxXTtcbiAgICAgICAgICAgIGlmICgoYjEgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgICAgIGMgPSAoYjAgJiAweDFGKSA8PCAweDYgfCAoYjEgJiAweDNGKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSAweDdGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChieXRlc1BlclNlcXVlbmNlID09PSAzKSB7XG4gICAgICAgICAgICBiMSA9IGJ1ZltpICsgMV07XG4gICAgICAgICAgICBiMiA9IGJ1ZltpICsgMl07XG4gICAgICAgICAgICBpZiAoKGIxICYgMHhDMCkgPT09IDB4ODAgJiYgKGIyICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgICAgICBjID0gKGIwICYgMHhGKSA8PCAweEMgfCAoYjEgJiAweDNGKSA8PCAweDYgfCAoYjIgJiAweDNGKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSAweDdGRiB8fCAoYyA+PSAweEQ4MDAgJiYgYyA8PSAweERGRkYpKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChieXRlc1BlclNlcXVlbmNlID09PSA0KSB7XG4gICAgICAgICAgICBiMSA9IGJ1ZltpICsgMV07XG4gICAgICAgICAgICBiMiA9IGJ1ZltpICsgMl07XG4gICAgICAgICAgICBiMyA9IGJ1ZltpICsgM107XG4gICAgICAgICAgICBpZiAoKGIxICYgMHhDMCkgPT09IDB4ODAgJiYgKGIyICYgMHhDMCkgPT09IDB4ODAgJiYgKGIzICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgICAgICBjID0gKGIwICYgMHhGKSA8PCAweDEyIHwgKGIxICYgMHgzRikgPDwgMHhDIHwgKGIyICYgMHgzRikgPDwgMHg2IHwgKGIzICYgMHgzRik7XG4gICAgICAgICAgICAgICAgaWYgKGMgPD0gMHhGRkZGIHx8IGMgPj0gMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGMgPSAweEZGRkQ7XG4gICAgICAgICAgICBieXRlc1BlclNlcXVlbmNlID0gMTtcblxuICAgICAgICB9IGVsc2UgaWYgKGMgPiAweEZGRkYpIHtcbiAgICAgICAgICAgIGMgLT0gMHgxMDAwMDtcbiAgICAgICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuICAgICAgICAgICAgYyA9IDB4REMwMCB8IGMgJiAweDNGRjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gcmVhZFV0ZjhUZXh0RGVjb2RlcihidWYsIHBvcywgZW5kKSB7XG4gICAgcmV0dXJuIHV0ZjhUZXh0RGVjb2Rlci5kZWNvZGUoYnVmLnN1YmFycmF5KHBvcywgZW5kKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlVXRmOChidWYsIHN0ciwgcG9zKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGMsIGxlYWQ7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpOyAvLyBjb2RlIHBvaW50XG5cbiAgICAgICAgaWYgKGMgPiAweEQ3RkYgJiYgYyA8IDB4RTAwMCkge1xuICAgICAgICAgICAgaWYgKGxlYWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IDB4REMwMCkge1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gMHhFRjtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkY7XG4gICAgICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEJEO1xuICAgICAgICAgICAgICAgICAgICBsZWFkID0gYztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IGxlYWQgLSAweEQ4MDAgPDwgMTAgfCBjIC0gMHhEQzAwIHwgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICAgICAgbGVhZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA+IDB4REJGRiB8fCAoaSArIDEgPT09IHN0ci5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEVGO1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gMHhCRjtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGVhZCA9IGM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGxlYWQpIHtcbiAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEVGO1xuICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkY7XG4gICAgICAgICAgICBidWZbcG9zKytdID0gMHhCRDtcbiAgICAgICAgICAgIGxlYWQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweDgwKSB7XG4gICAgICAgICAgICBidWZbcG9zKytdID0gYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChjIDwgMHg4MDApIHtcbiAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gYyA+PiAweDYgfCAweEMwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IDB4MTAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgPj4gMHhDIHwgMHhFMDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gYyA+PiAweDEyIHwgMHhGMDtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgPj4gMHhDICYgMHgzRiB8IDB4ODA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSBjID4+IDB4NiAmIDB4M0YgfCAweDgwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgJiAweDNGIHwgMHg4MDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcG9zO1xufVxuIiwiJ3VzZSBzdHJpY3QnOyAvLyBjb2RlIGdlbmVyYXRlZCBieSBwYmYgdjMuMi4xXG5sZXQgZXhwb3J0cyA9IHt9XG5cbmV4cG9ydCBjb25zdCBtdHlwZSA9IGV4cG9ydHMubXR5cGUgPSB7XG4gICAgXCJtdF91bmtub3duXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiAwLFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfaW9tZGF0YVwiOiB7XG4gICAgICAgIFwidmFsdWVcIjogMSxcbiAgICAgICAgXCJvcHRpb25zXCI6IHt9XG4gICAgfSxcbiAgICBcIm10X21pbm1heFwiOiB7XG4gICAgICAgIFwidmFsdWVcIjogMixcbiAgICAgICAgXCJvcHRpb25zXCI6IHt9XG4gICAgfSxcbiAgICBcIm10X3N5c2luZm9cIjoge1xuICAgICAgICBcInZhbHVlXCI6IDMsXG4gICAgICAgIFwib3B0aW9uc1wiOiB7fVxuICAgIH0sXG4gICAgXCJtdF90Y2RhdGFcIjoge1xuICAgICAgICBcInZhbHVlXCI6IDQsXG4gICAgICAgIFwib3B0aW9uc1wiOiB7fVxuICAgIH0sXG4gICAgXCJtdF92Z2NkYXRhXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA1LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfdGN6b25lXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA2LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfbWR0bXNnXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA3LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9XG59O1xuXG4vLyB1bmtub3duX21zZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB1bmtub3duX21zZyA9IGV4cG9ydHMudW5rbm93bl9tc2cgPSB7fTtcblxudW5rbm93bl9tc2cucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh1bmtub3duX21zZy5fcmVhZEZpZWxkLCB7bXQ6IDB9LCBlbmQpO1xufTtcbnVua25vd25fbXNnLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG59O1xudW5rbm93bl9tc2cud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xufTtcblxuLy8gaW9tZGF0YSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBpb21kYXRhID0gZXhwb3J0cy5pb21kYXRhID0ge307XG5cbmlvbWRhdGEucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhpb21kYXRhLl9yZWFkRmllbGQsIHttdDogMCwgdG90YWxfZF9pbnB1dHM6IDAsIHRvdGFsX2Rfb3V0cHV0czogMCwgdG90YWxfYV9pbnB1dHM6IDAsIHRvdGFsX2Ffb3V0cHV0czogMCwgZF9pbnB1dHM6IG51bGwsIGRfb3V0cHV0czogbnVsbCwgYV9pbnB1dHM6IG51bGwsIGFfb3V0cHV0czogbnVsbH0sIGVuZCk7XG59O1xuaW9tZGF0YS5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnRvdGFsX2RfaW5wdXRzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDMpIG9iai50b3RhbF9kX291dHB1dHMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLnRvdGFsX2FfaW5wdXRzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDUpIG9iai50b3RhbF9hX291dHB1dHMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNikgb2JqLmRfaW5wdXRzID0gcGJmLnJlYWRCeXRlcygpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNykgb2JqLmRfb3V0cHV0cyA9IHBiZi5yZWFkQnl0ZXMoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDgpIG9iai5hX2lucHV0cyA9IHBiZi5yZWFkQnl0ZXMoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDkpIG9iai5hX291dHB1dHMgPSBwYmYucmVhZEJ5dGVzKCk7XG59O1xuaW9tZGF0YS53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai50b3RhbF9kX2lucHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnRvdGFsX2RfaW5wdXRzKTtcbiAgICBpZiAob2JqLnRvdGFsX2Rfb3V0cHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoMywgb2JqLnRvdGFsX2Rfb3V0cHV0cyk7XG4gICAgaWYgKG9iai50b3RhbF9hX2lucHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoNCwgb2JqLnRvdGFsX2FfaW5wdXRzKTtcbiAgICBpZiAob2JqLnRvdGFsX2Ffb3V0cHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLnRvdGFsX2Ffb3V0cHV0cyk7XG4gICAgaWYgKG9iai5kX2lucHV0cykgcGJmLndyaXRlQnl0ZXNGaWVsZCg2LCBvYmouZF9pbnB1dHMpO1xuICAgIGlmIChvYmouZF9vdXRwdXRzKSBwYmYud3JpdGVCeXRlc0ZpZWxkKDcsIG9iai5kX291dHB1dHMpO1xuICAgIGlmIChvYmouYV9pbnB1dHMpIHBiZi53cml0ZUJ5dGVzRmllbGQoOCwgb2JqLmFfaW5wdXRzKTtcbiAgICBpZiAob2JqLmFfb3V0cHV0cykgcGJmLndyaXRlQnl0ZXNGaWVsZCg5LCBvYmouYV9vdXRwdXRzKTtcbn07XG5cbi8vIG1pbm1heCA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBtaW5tYXggPSBleHBvcnRzLm1pbm1heCA9IHt9O1xuXG5taW5tYXgucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhtaW5tYXguX3JlYWRGaWVsZCwge210OiAwLCBtaW5fem9uZTogMCwgbWF4X3pvbmU6IDAsIG1pbjogMCwgbWF4OiAwfSwgZW5kKTtcbn07XG5taW5tYXguX3JlYWRGaWVsZCA9IGZ1bmN0aW9uICh0YWcsIG9iaiwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PT0gMSkgb2JqLm10ID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDIpIG9iai5taW5fem9uZSA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmoubWF4X3pvbmUgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLm1pbiA9IHBiZi5yZWFkVmFyaW50KHRydWUpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNSkgb2JqLm1heCA9IHBiZi5yZWFkVmFyaW50KHRydWUpO1xufTtcbm1pbm1heC53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5taW5fem9uZSkgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLm1pbl96b25lKTtcbiAgICBpZiAob2JqLm1heF96b25lKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgzLCBvYmoubWF4X3pvbmUpO1xuICAgIGlmIChvYmoubWluKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg0LCBvYmoubWluKTtcbiAgICBpZiAob2JqLm1heCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLm1heCk7XG59O1xuXG4vLyBzeXNpbmZvID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IHN5c2luZm8gPSBleHBvcnRzLnN5c2luZm8gPSB7fTtcblxuc3lzaW5mby5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKHN5c2luZm8uX3JlYWRGaWVsZCwge210OiAwLCBzdGF0ZTogMCwgb3JkZXJfc3RhdHVzOiAwLCBvcmRlcl9pZDogMCwgdGFyZ2V0OiAwLCBpbmpfY3ljbGU6IDAsIGN5Y2xlX2lkOiAwLCBnb29kX3BhcnRzOiAwLCB0ZXh0X21lc3NhZ2U6IFwiXCIsIG1zZzogbnVsbCwgZG1zZzogbnVsbH0sIGVuZCk7XG59O1xuc3lzaW5mby5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnN0YXRlID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIG9iai5vcmRlcl9zdGF0dXMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNSkgb2JqLm9yZGVyX2lkID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA2KSBvYmoudGFyZ2V0ID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA3KSBvYmouaW5qX2N5Y2xlID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA4KSBvYmouY3ljbGVfaWQgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDkpIG9iai5nb29kX3BhcnRzID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmoudGV4dF9tZXNzYWdlID0gcGJmLnJlYWRTdHJpbmcoKSwgb2JqLm1zZyA9IFwidGV4dF9tZXNzYWdlXCI7XG4gICAgZWxzZSBpZiAodGFnID09PSAxMCkgb2JqLmRtc2cgPSBkYm1zZy5yZWFkKHBiZiwgcGJmLnJlYWRWYXJpbnQoKSArIHBiZi5wb3MpLCBvYmoubXNnID0gXCJkbXNnXCI7XG59O1xuc3lzaW5mby53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5zdGF0ZSkgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnN0YXRlKTtcbiAgICBpZiAob2JqLm9yZGVyX3N0YXR1cykgcGJmLndyaXRlVmFyaW50RmllbGQoNCwgb2JqLm9yZGVyX3N0YXR1cyk7XG4gICAgaWYgKG9iai5vcmRlcl9pZCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLm9yZGVyX2lkKTtcbiAgICBpZiAob2JqLnRhcmdldCkgcGJmLndyaXRlVmFyaW50RmllbGQoNiwgb2JqLnRhcmdldCk7XG4gICAgaWYgKG9iai5pbmpfY3ljbGUpIHBiZi53cml0ZVZhcmludEZpZWxkKDcsIG9iai5pbmpfY3ljbGUpO1xuICAgIGlmIChvYmouY3ljbGVfaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDgsIG9iai5jeWNsZV9pZCk7XG4gICAgaWYgKG9iai5nb29kX3BhcnRzKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg5LCBvYmouZ29vZF9wYXJ0cyk7XG4gICAgaWYgKG9iai50ZXh0X21lc3NhZ2UpIHBiZi53cml0ZVN0cmluZ0ZpZWxkKDMsIG9iai50ZXh0X21lc3NhZ2UpO1xuICAgIGlmIChvYmouZG1zZykgcGJmLndyaXRlTWVzc2FnZSgxMCwgZGJtc2cud3JpdGUsIG9iai5kbXNnKTtcbn07XG5cbi8vIGRibXNnID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IGRibXNnID0gZXhwb3J0cy5kYm1zZyA9IHt9O1xuXG5kYm1zZy5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKGRibXNnLl9yZWFkRmllbGQsIHtkYmlkOiAwLCBwYXJhbWV0ZXJzOiBcIlwifSwgZW5kKTtcbn07XG5kYm1zZy5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxMDApIG9iai5kYmlkID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSAxMDEpIG9iai5wYXJhbWV0ZXJzID0gcGJmLnJlYWRTdHJpbmcoKTtcbn07XG5kYm1zZy53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmouZGJpZCkgcGJmLndyaXRlVmFyaW50RmllbGQoMTAwLCBvYmouZGJpZCk7XG4gICAgaWYgKG9iai5wYXJhbWV0ZXJzKSBwYmYud3JpdGVTdHJpbmdGaWVsZCgxMDEsIG9iai5wYXJhbWV0ZXJzKTtcbn07XG5cbi8vIG1kdG1zZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBtZHRtc2cgPSBleHBvcnRzLm1kdG1zZyA9IHt9O1xuXG5tZHRtc2cucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhtZHRtc2cuX3JlYWRGaWVsZCwge210OiAwLCBwcm9ncmVzczogMCwgZGJpZDogMCwgcGFyYW1ldGVyczogXCJcIn0sIGVuZCk7XG59O1xubWR0bXNnLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmoucHJvZ3Jlc3MgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDEwMCkgb2JqLmRiaWQgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDEwMSkgb2JqLnBhcmFtZXRlcnMgPSBwYmYucmVhZFN0cmluZygpO1xufTtcbm1kdG1zZy53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5wcm9ncmVzcykgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnByb2dyZXNzKTtcbiAgICBpZiAob2JqLmRiaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEwMCwgb2JqLmRiaWQpO1xuICAgIGlmIChvYmoucGFyYW1ldGVycykgcGJmLndyaXRlU3RyaW5nRmllbGQoMTAxLCBvYmoucGFyYW1ldGVycyk7XG59O1xuXG4vLyB0Y2RhdGEgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgdGNkYXRhID0gZXhwb3J0cy50Y2RhdGEgPSB7fTtcblxudGNkYXRhLnJlYWQgPSBmdW5jdGlvbiAocGJmLCBlbmQpIHtcbiAgICByZXR1cm4gcGJmLnJlYWRGaWVsZHModGNkYXRhLl9yZWFkRmllbGQsIHttdDogMCwgc2xpY2VfaWQ6IDAsIHpvbmVzOiAwLCByZWNvcmRzOiBbXX0sIGVuZCk7XG59O1xudGNkYXRhLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmouc2xpY2VfaWQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMykgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIHBiZi5yZWFkUGFja2VkVmFyaW50KG9iai5yZWNvcmRzLCB0cnVlKTtcbn07XG50Y2RhdGEud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xuICAgIGlmIChvYmouc2xpY2VfaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDIsIG9iai5zbGljZV9pZCk7XG4gICAgaWYgKG9iai56b25lcykgcGJmLndyaXRlVmFyaW50RmllbGQoMywgb2JqLnpvbmVzKTtcbiAgICBpZiAob2JqLnJlY29yZHMpIHBiZi53cml0ZVBhY2tlZFZhcmludCg0LCBvYmoucmVjb3Jkcyk7XG59O1xuXG4vLyB2Z2NkYXRhID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IHZnY2RhdGEgPSBleHBvcnRzLnZnY2RhdGEgPSB7fTtcblxudmdjZGF0YS5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKHZnY2RhdGEuX3JlYWRGaWVsZCwge210OiAwLCBzbGljZV9pZDogMCwgem9uZXM6IDAsIHJlY29yZHM6IFtdfSwgZW5kKTtcbn07XG52Z2NkYXRhLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmouc2xpY2VfaWQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMykgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIHBiZi5yZWFkUGFja2VkVmFyaW50KG9iai5yZWNvcmRzLCB0cnVlKTtcbn07XG52Z2NkYXRhLndyaXRlID0gZnVuY3Rpb24gKG9iaiwgcGJmKSB7XG4gICAgaWYgKG9iai5tdCkgcGJmLndyaXRlVmFyaW50RmllbGQoMSwgb2JqLm10KTtcbiAgICBpZiAob2JqLnNsaWNlX2lkKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgyLCBvYmouc2xpY2VfaWQpO1xuICAgIGlmIChvYmouem9uZXMpIHBiZi53cml0ZVZhcmludEZpZWxkKDMsIG9iai56b25lcyk7XG4gICAgaWYgKG9iai5yZWNvcmRzKSBwYmYud3JpdGVQYWNrZWRWYXJpbnQoNCwgb2JqLnJlY29yZHMpO1xufTtcblxuLy8gdGN6b25lX3JlY29yZCA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB0Y3pvbmVfcmVjb3JkID0gZXhwb3J0cy50Y3pvbmVfcmVjb3JkID0ge307XG5cbnRjem9uZV9yZWNvcmQucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh0Y3pvbmVfcmVjb3JkLl9yZWFkRmllbGQsIHt0ZW1wX3NwOiAwLCBtYW51YWxfc3A6IDAsIGFjdHVhbF90ZW1wOiAwLCBhY3R1YWxfcGVyY2VudDogMCwgYWN0dWFsX2N1cnJlbnQ6IDAsIHNldHRpbmdzOiAwLCB0ZW1wZXJhdHVyZV9hbGFybTogMCwgcG93ZXJfYWxhcm06IDB9LCBlbmQpO1xufTtcbnRjem9uZV9yZWNvcmQuX3JlYWRGaWVsZCA9IGZ1bmN0aW9uICh0YWcsIG9iaiwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PT0gMSkgb2JqLnRlbXBfc3AgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLm1hbnVhbF9zcCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmouYWN0dWFsX3RlbXAgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLmFjdHVhbF9wZXJjZW50ID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDUpIG9iai5hY3R1YWxfY3VycmVudCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSA2KSBvYmouc2V0dGluZ3MgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNykgb2JqLnRlbXBlcmF0dXJlX2FsYXJtID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDgpIG9iai5wb3dlcl9hbGFybSA9IHBiZi5yZWFkVmFyaW50KCk7XG59O1xudGN6b25lX3JlY29yZC53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoudGVtcF9zcCkgcGJmLndyaXRlVmFyaW50RmllbGQoMSwgb2JqLnRlbXBfc3ApO1xuICAgIGlmIChvYmoubWFudWFsX3NwKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgyLCBvYmoubWFudWFsX3NwKTtcbiAgICBpZiAob2JqLmFjdHVhbF90ZW1wKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgzLCBvYmouYWN0dWFsX3RlbXApO1xuICAgIGlmIChvYmouYWN0dWFsX3BlcmNlbnQpIHBiZi53cml0ZVZhcmludEZpZWxkKDQsIG9iai5hY3R1YWxfcGVyY2VudCk7XG4gICAgaWYgKG9iai5hY3R1YWxfY3VycmVudCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLmFjdHVhbF9jdXJyZW50KTtcbiAgICBpZiAob2JqLnNldHRpbmdzKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg2LCBvYmouc2V0dGluZ3MpO1xuICAgIGlmIChvYmoudGVtcGVyYXR1cmVfYWxhcm0pIHBiZi53cml0ZVZhcmludEZpZWxkKDcsIG9iai50ZW1wZXJhdHVyZV9hbGFybSk7XG4gICAgaWYgKG9iai5wb3dlcl9hbGFybSkgcGJmLndyaXRlVmFyaW50RmllbGQoOCwgb2JqLnBvd2VyX2FsYXJtKTtcbn07XG5cbi8vIHRjem9uZSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB0Y3pvbmUgPSBleHBvcnRzLnRjem9uZSA9IHt9O1xuXG50Y3pvbmUucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh0Y3pvbmUuX3JlYWRGaWVsZCwge210OiAwLCB6b25lczogMCwgcmVjb3JkczogW119LCBlbmQpO1xufTtcbnRjem9uZS5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDMpIG9iai5yZWNvcmRzLnB1c2godGN6b25lX3JlY29yZC5yZWFkKHBiZiwgcGJmLnJlYWRWYXJpbnQoKSArIHBiZi5wb3MpKTtcbn07XG50Y3pvbmUud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xuICAgIGlmIChvYmouem9uZXMpIHBiZi53cml0ZVZhcmludEZpZWxkKDIsIG9iai56b25lcyk7XG4gICAgaWYgKG9iai5yZWNvcmRzKSBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5yZWNvcmRzLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVNZXNzYWdlKDMsIHRjem9uZV9yZWNvcmQud3JpdGUsIG9iai5yZWNvcmRzW2ldKTtcbn07XG4iLCJleHBvcnQgY29uc3QgbWF4Q2h1bmtTaXplID0gMTAwXG5cbmxldCBwYXJhbXMgPSB7XG4gIHJhdGU6IDEwXG59XG5cbmxldCBidWZmZXIgPSBbXVxuXG5cbi8vIGVuc3VyZSBidWZmZXIgaXMgbmV2ZXIgZmlsbGVkIGZhc3RlciB0aGFuIHRoZSBzcGVjaWZpZWQgcmF0ZVxuY29uc3QgdHJ5UHVzaCA9IChmcmFtZSkgPT4ge1xuICBmcmFtZS50cyA9IGZyYW1lLnRpbWUuZ2V0VGltZSgpXG4gIGNvbnN0IGxhc3RGcmFtZSA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cbiAgaWYoIWxhc3RGcmFtZSkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICAgIHJldHVyblxuICB9XG4gIC8vIG1pbiBpbnRlcnZhbCBpcyBtaW4gbXMgYmV0d2VlbiBmcmFtZXMgd2l0aCA1bXMgcGFkZGluZ1xuICBjb25zdCBtaW5JbnR2bCA9IDEwMDAgLyBwYXJhbXMucmF0ZSArIDVcbiAgaWYoZnJhbWUudGltZSAtIGxhc3RGcmFtZS50aW1lID49IG1pbkludHZsKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgYnVmZmVyXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uICh7IHRzLCBkYXRhIH0pIHtcblxuICAvLyBzaW11bGF0ZSA0NTAgem9uZXNcbiAgLy8gZGF0YSA9IGRhdGEuY29uY2F0KGRhdGEpLmNvbmNhdChkYXRhKVxuXG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0cylcbiAgY29uc3QgZnJhbWUgPSB7IGRhdGEsIGRhdGUsIHRpbWU6IHRzIH1cblxuICB0cnlQdXNoKGZyYW1lKVxuICAvLyB0d2VlbihmcmFtZSwgMTIpXG5cbiAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKC03NTAwKVxufVxuXG5cbmxldCBpbnRlcnZhbHMgPSB7fVxubGV0IGxhdGVzdCA9IHt9XG5sZXQgZWFybGllc3QgPSB7fVxubGV0IG5lZWRzUmVzZXQgPSB7fVxuXG5leHBvcnQgY29uc3QgYnVmZmVyQ29tbWFuZHMgPSAocG9ydCwgZSwgaWQpID0+IHtcbiAgY29uc3QgeyBkYXRhIH0gPSBlXG5cbiAgY29uc3QgcG9zdCA9IChkYXRhKSA9PiB7XG4gICAgaWYocG9ydCkge1xuICAgICAgcG9ydC5wb3N0TWVzc2FnZShkYXRhKSBcbiAgICB9IGVsc2Uge1xuICAgICAgcG9zdE1lc3NhZ2VcbiAgICB9XG4gIH1cbiAgXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ3JlYWRCdWZmZXInKSB7XG5cbiAgICAvLyBzZW5kIGRhdGEgaW4gYmF0Y2hlcywgbGltaXRpbmcgbWF4IHRvIGF2b2lkIE9PTSB3aGVuIHNlcmlhbGl6aW5nIHRvXG4gICAgLy8gcGFzcyBiZXR3ZWVuIHRocmVhZHNcbiAgICBjb25zdCBzZW5kQ2h1bmsgPSAoKSA9PiB7XG4gICAgICBjb25zdCByZXNldEJ1ZmZlciA9ICgpID0+IHtcbiAgICAgICAgbGF0ZXN0W2lkXSA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV0gJiYgYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXS50c1xuICAgICAgICBlYXJsaWVzdFtpZF0gPSBsYXRlc3RbaWRdICsgMVxuICAgICAgICBuZWVkc1Jlc2V0W2lkXSA9IGZhbHNlXG4gICAgICB9XG4gICAgICBpZiAoIWxhdGVzdFtpZF0gJiYgYnVmZmVyLmxlbmd0aCkge1xuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICB9XG5cbiAgICAgIGlmKG5lZWRzUmVzZXRbaWRdKSB7XG4gICAgICAgIHBvc3QoJ3Jlc2V0JylcbiAgICAgICAgcmVzZXRCdWZmZXIoKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYobGF0ZXN0W2lkXSkge1xuICAgICAgICBjb25zdCBuZXdlc3QgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA+IGxhdGVzdFtpZF0pXG4gICAgICAgIGNvbnN0IGJhY2tGaWxsID0gYnVmZmVyLmZpbHRlcih4ID0+IHgudHMgPCBlYXJsaWVzdFtpZF0pLnNsaWNlKC0obWF4Q2h1bmtTaXplIC0gbmV3ZXN0Lmxlbmd0aCkpXG4gICAgICAgIGNvbnN0IHVwZGF0ZSA9IGJhY2tGaWxsLmNvbmNhdChuZXdlc3QpXG4gICAgICAgIGlmICh1cGRhdGUubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgbGF0ZXN0RW50cnkgPSB1cGRhdGVbdXBkYXRlLmxlbmd0aCAtIDFdXG4gICAgICAgICAgY29uc3QgZmlyc3RFbnRyeSA9IHVwZGF0ZVswXVxuICAgICAgICAgIGxhdGVzdFtpZF0gPSBsYXRlc3RFbnRyeS50aW1lXG4gICAgICAgICAgaWYoZmlyc3RFbnRyeS50aW1lIDwgZWFybGllc3RbaWRdKSBlYXJsaWVzdFtpZF0gPSBmaXJzdEVudHJ5LnRpbWVcbiAgICAgICAgICBwb3N0KHsgdXBkYXRlLCBwYXJhbXMgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY29uc29sZS5sb2coc2l6ZU9mKFsgLi4uYnVmZmVyIF0pKVxuICAgIH1cblxuICAgIGludGVydmFsc1tpZF0gPSBzZXRJbnRlcnZhbChzZW5kQ2h1bmssIDIwMClcbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ3NldEJ1ZmZlclBhcmFtcycpIHtcbiAgICBsZXQgcmVzZXQgPSBmYWxzZVxuICAgIGNvbnNvbGUubG9nKCdzZXR0aW5nIHBhcmFtcycsIGRhdGEucGFyYW1zKVxuICAgIGZvcihsZXQga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEucGFyYW1zKSkge1xuICAgICAgaWYoZGF0YS5wYXJhbXNba2V5XSAhPSBwYXJhbXNba2V5XSkge1xuICAgICAgICByZXNldCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgcGFyYW1zID0geyAuLi5wYXJhbXMsIC4uLmRhdGEucGFyYW1zIHx8IHt9fVxuICAgIGlmKHJlc2V0KSB7XG4gICAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoMCwgMClcbiAgICAgIGZvciAobGV0IGtleSBvZiBPYmplY3Qua2V5cyhuZWVkc1Jlc2V0KSkge1xuICAgICAgICBuZWVkc1Jlc2V0W2tleV0gPSB0cnVlXG4gICAgICB9XG4gICAgfSBcbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ2Nsb3NlJykge1xuICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxzW2lkXSlcbiAgICBsYXRlc3RbaWRdID0gMFxuICB9XG59XG5cblxuXG5cblxuXG4vLyB1dGlsaXRpZXMgZm9yIHRlc3RpbmdcblxuY29uc3QgdHdlZW4gPSAobmV4dCwgZnJhbWVzKSA9PiB7XG5cbiAgbGV0IGZyYW1lTGlzdCA9IFtdXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgZnJhbWVzOyBpKyspIHtcbiAgICBmcmFtZUxpc3QucHVzaChpKVxuICB9XG5cbiAgY29uc3QgeyB0aW1lLCBkYXRhIH0gPSBuZXh0XG4gIGNvbnN0IGxhc3RCdWZmZXIgPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdXG5cbiAgLy8gdGVzdCB0d2VlbmluZ1xuICBpZiAobGFzdEJ1ZmZlcikge1xuICAgIGZvciAobGV0IHggb2YgZnJhbWVMaXN0KSB7XG4gICAgICBsZXQgdHdlZW4gPSBbXVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0QnVmZmVyLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGFzdCA9IGxhc3RCdWZmZXIuZGF0YVtpXVxuICAgICAgICBjb25zdCBjdXJyZW50ID0gZGF0YVtpXVxuICAgICAgICBpZiAobGFzdCAmJiBjdXJyZW50KSB7XG4gICAgICAgICAgbGV0IHR3ZWVuZWQgPSB7IC4uLmN1cnJlbnQgfVxuICAgICAgICAgIGZvciAobGV0IHByb3Agb2YgWyAnYWN0dWFsX3RlbXAnLCAnYWN0dWFsX2N1cnJlbnQnLCAnYWN0dWFsX3BlcmNlbnQnIF0pIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHByb3ApXG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IChjdXJyZW50W3Byb3BdIC0gbGFzdFtwcm9wXSkgLyBmcmFtZXNcbiAgICAgICAgICAgIHR3ZWVuZWRbcHJvcF0gPSBsYXN0W3Byb3BdICsgZGVsdGEgKiB4XG4gICAgICAgICAgfVxuICAgICAgICAgIHR3ZWVuLnB1c2godHdlZW5lZClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3Qgb2Zmc2V0ID0gNTAwIC8gZnJhbWVzICogeFxuICAgICAgY29uc3QgdXBkYXRlZFRTID0gdGltZSAtIDUwMCArIG9mZnNldFxuICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHVwZGF0ZWRUUylcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdHJ5UHVzaCh7IHRpbWU6IG5ldyBEYXRlKHVwZGF0ZWRUUyksIHRzOiB1cGRhdGVkVFMsIGRhdGUsIGRhdGE6IHR3ZWVuIH0pLCBvZmZzZXQpXG4gICAgfVxuICB9XG4gIHNldFRpbWVvdXQoKCkgPT4gdHJ5UHVzaChuZXh0KSwgNTAwKVxufVxuXG5cblxuY29uc3QgdHlwZVNpemVzID0ge1xuICBcInVuZGVmaW5lZFwiOiAoKSA9PiAwLFxuICBcImJvb2xlYW5cIjogKCkgPT4gNCxcbiAgXCJudW1iZXJcIjogKCkgPT4gOCxcbiAgXCJzdHJpbmdcIjogaXRlbSA9PiAyICogaXRlbS5sZW5ndGgsXG4gIFwib2JqZWN0XCI6IGl0ZW0gPT4gIWl0ZW0gPyAwIDogT2JqZWN0XG4gICAgLmtleXMoaXRlbSlcbiAgICAucmVkdWNlKCh0b3RhbCwga2V5KSA9PiBzaXplT2Yoa2V5KSArIHNpemVPZihpdGVtW2tleV0pICsgdG90YWwsIDApXG59XG5cbmNvbnN0IHNpemVPZiA9IHZhbHVlID0+IHR5cGVTaXplc1t0eXBlb2YgdmFsdWVdKHZhbHVlKSIsImltcG9ydCBQYmYgZnJvbSAncGJmJ1xuaW1wb3J0IHsgdGNkYXRhLCBtaW5tYXgsIHVua25vd25fbXNnLCB0Y3pvbmUsIHN5c2luZm8sIG1kdG1zZyB9IGZyb20gJy4vZGVjb2RlLnByb3RvJ1xuaW1wb3J0IGRhdGFCdWZmZXIsIHsgYnVmZmVyQ29tbWFuZHMgfSBmcm9tICcuL2J1ZmZlcidcblxuY29uc3QgbWVzc2FnZVR5cGVzID0geyB0Y2RhdGEsIG1pbm1heCwgdW5rbm93bl9tc2csIHRjem9uZSwgc3lzaW5mbywgbWR0bXNnIH1cblxubGV0IHNvY2tldFxubGV0IHBvcnRzID0gW11cblxubGV0IGNvbm5lY3RlZENoYW5uZWxzID0gW11cbmxldCBhY3RpdmVDaGFubmVscyA9IFtdXG5cbmNvbnN0IHVwZGF0ZUFjdGl2ZSA9IGFzeW5jICgpID0+IHtcbiAgYWN0aXZlQ2hhbm5lbHMgPSBbXVxuICBmb3IobGV0IHAgb2YgcG9ydHMpIHtcbiAgICBhY3RpdmVDaGFubmVscyA9IGFjdGl2ZUNoYW5uZWxzLmNvbmNhdChwLnN1YnNjcmlwdGlvbnMpXG4gIH1cbiAgYWN0aXZlQ2hhbm5lbHMgPSBbIC4uLiBuZXcgU2V0KGFjdGl2ZUNoYW5uZWxzKSBdXG4gIGZvcihsZXQgYyBvZiBjb25uZWN0ZWRDaGFubmVscykge1xuICAgIGlmKCFhY3RpdmVDaGFubmVscy5pbmNsdWRlcyhjKSkge1xuICAgICAgYXdhaXQgc2VuZChgLSR7Y31gKVxuICAgIH1cbiAgfVxuICBhd2FpdCBjb25uZWN0KClcbn1cblxuY29uc3QgZ2V0UG9ydERhdGEgPSBwb3J0ID0+IHtcbiAgY29uc3QgcCA9IHBvcnRzLmZpbmQoeCA9PiB4LnBvcnQgPT0gcG9ydClcbiAgcmV0dXJuIHAgPyBwLmRhdGEgOiB7fVxufVxuXG5jb25zdCBzZXRQb3J0RGF0YSA9IChwb3J0LCBkYXRhKSA9PiB7XG4gIGNvbnN0IHAgPSBwb3J0cy5maW5kKHggPT4geC5wb3J0ID09IHBvcnQpXG4gIGlmKCFwKSB7XG4gICAgcG9ydHMucHVzaCh7IC4uLmRhdGEsIHBvcnQgfSlcbiAgfSBlbHNlIHtcbiAgICBwb3J0cyA9IHBvcnRzLm1hcCh4ID0+IHtcbiAgICAgIGlmKHgucG9ydCA9PSBwb3J0KSB7XG4gICAgICAgIHJldHVybiB7IC4uLngsIC4uLmRhdGEsIHBvcnQgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHhcbiAgICB9KVxuICB9XG59XG5cbmNvbnN0IGFkZFBvcnRTdWJzY3JpcHRpb25zID0gKHBvcnQsIHN1YnNjcmlwdGlvbnMpID0+IHtcbiAgY29uc3QgY3VycmVudCA9IChnZXRQb3J0RGF0YShwb3J0KSB8fCB7fSkuc3Vic2NyaXB0aW9ucyB8fCBbXVxuICBzZXRQb3J0RGF0YShwb3J0LCB7XG4gICAgc3Vic2NyaXB0aW9uczogWyAuLi4gbmV3IFNldChjdXJyZW50LmNvbmNhdChzdWJzY3JpcHRpb25zKSkgXVxuICB9KVxuICB1cGRhdGVBY3RpdmUoKVxufVxuXG5cbmxldCByZWFkeSA9IGZhbHNlXG5sZXQgc29ja2V0VGFyZ2V0XG5sZXQgcXVldWUgPSBbXVxuXG5jb25zdCBpbml0aWF0ZSA9IGFzeW5jICgpID0+IHtcbiAgcmVhZHkgPSB0cnVlXG4gIGZvcihsZXQgZm4gb2YgcXVldWUpIHtcbiAgICBmbigpXG4gIH1cbiAgY29ubmVjdCgpXG59XG5cbihmdW5jdGlvbiAoKSB7XG4gIEZpbGUucHJvdG90eXBlLmFycmF5QnVmZmVyID0gRmlsZS5wcm90b3R5cGUuYXJyYXlCdWZmZXIgfHwgbXlBcnJheUJ1ZmZlclxuICBCbG9iLnByb3RvdHlwZS5hcnJheUJ1ZmZlciA9IEJsb2IucHJvdG90eXBlLmFycmF5QnVmZmVyIHx8IG15QXJyYXlCdWZmZXJcblxuICBmdW5jdGlvbiBteUFycmF5QnVmZmVyKCkge1xuICAgIC8vIHRoaXM6IEZpbGUgb3IgQmxvYlxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgbGV0IGZyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgICAgZnIub25sb2FkID0gKCkgPT4ge1xuICAgICAgICByZXNvbHZlKGZyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIGZyLnJlYWRBc0FycmF5QnVmZmVyKHRoaXMpXG4gICAgfSlcbiAgfVxufSkoKVxuXG5cbmNvbnN0IGNyZWF0ZVNvY2tldCA9ICgpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgaWYocmVhZHkpIHJlc29sdmUoKVxuICBpZighc29ja2V0KSB7XG4gICAgc29ja2V0ID0gbmV3IFdlYlNvY2tldChzb2NrZXRUYXJnZXQpXG4gICAgXG4gICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCBlID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdTb2NrZXQgY29ubmVjdGlvbiBlc3RhYmxpc2hlZCcpXG4gICAgICBpbml0aWF0ZSgpXG4gICAgICAvLyBjb25uZWN0KClcbiAgICB9KVxuXG4gICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBhc3luYyBlID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGUpXG4gICAgICBjb25zdCB0cyA9IG5ldyBEYXRlKClcblxuICAgICAgY29uc3QgYmxvYiA9IGUuZGF0YVxuICAgICAgLy8gY29uc29sZS5sb2coZS5kYXRhKVxuICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgYmxvYi5hcnJheUJ1ZmZlcigpXG4gICAgICBjb25zdCBwYmYgPSBuZXcgUGJmKGJ1ZmZlcilcblxuICAgICAgY29uc3QgeyBtdCB9ID0gdW5rbm93bl9tc2cucmVhZChwYmYpXG4gICAgICBjb25zdCBkZWNvZGVycyA9IHtcbiAgICAgICAgMjogJ21pbm1heCcsXG4gICAgICAgIDM6ICdzeXNpbmZvJyxcbiAgICAgICAgNDogJ3RjZGF0YScsXG4gICAgICAgIDY6ICd0Y3pvbmUnLFxuICAgICAgICA3OiAnbWR0bXNnJ1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZSA9IGRlY29kZXJzW210XVxuXG4gICAgICBjb25zdCBkYXRhID0gbWVzc2FnZVR5cGVzW3R5cGVdLnJlYWQobmV3IFBiZihidWZmZXIpKVxuXG4gICAgICAvLyBERVBSRUNBVEVEOiBubyBVaW50OEFycmF5cyBjdXJyZW50bHkgYmVpbmcgcGFzc2VkXG5cbiAgICAgIC8vIGZvcihsZXQga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAvLyAgIGlmKGRhdGFba2V5XSAmJiBkYXRhW2tleV0uY29uc3RydWN0b3IgPT09IFVpbnQ4QXJyYXkpIHtcbiAgICAgIC8vICAgICBkYXRhW2tleV0gPSBnZXRTdHJpbmcoZGF0YVtrZXldKVxuICAgICAgLy8gICB9XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIHBvcnRzWzBdLnBvcnQucG9zdE1lc3NhZ2UoZGF0YSlcblxuICAgICAgaWYobXQgPT0gNikge1xuICAgICAgICBkYXRhQnVmZmVyLndyaXRlKHsgdHMsIGRhdGE6IGRhdGEucmVjb3JkcyB9KVxuICAgICAgfVxuXG4gICAgICBmb3IobGV0IHsgcG9ydCwgc3Vic2NyaXB0aW9ucyB9IG9mIHBvcnRzKSB7XG4gICAgICAgIGlmKHN1YnNjcmlwdGlvbnMuaW5jbHVkZXModHlwZSkpIHtcbiAgICAgICAgICBpZihwb3J0KSB7XG4gICAgICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKHsgdHMsIGRhdGEgfSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcG9zdE1lc3NhZ2UoeyB0cywgZGF0YSB9KVxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gcG9zdE1lc3NhZ2UoZGF0YSlcbiAgICB9KVxuXG4gICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgZSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnU29ja2V0IGNvbm5lY3Rpb24gYnJva2VuISBSZXRyeWluZyBpbiAxcy4uLicpXG4gICAgICByZWFkeSA9IGZhbHNlXG4gICAgICBzb2NrZXQgPSBudWxsXG4gICAgICBjb25uZWN0ZWRDaGFubmVscyA9IFtdXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgY3JlYXRlU29ja2V0KClcbiAgICAgIH0sIDEwMDApXG4gICAgfSlcbiAgfVxuICBxdWV1ZS5wdXNoKHJlc29sdmUpXG59KVxuXG5jb25zdCBzZW5kID0gYXN5bmMgbXNnID0+IHtcbiAgYXdhaXQgY3JlYXRlU29ja2V0KClcbiAgY29uc29sZS5sb2coYHNlbmRpbmcgJHttc2d9YClcbiAgc29ja2V0LnNlbmQobXNnKVxufVxuXG5jb25zdCBjb25uZWN0ID0gYXN5bmMgKCkgPT4ge1xuICBsZXQgdG9Db25uZWN0ID0gYWN0aXZlQ2hhbm5lbHMuZmlsdGVyKHggPT4gIWNvbm5lY3RlZENoYW5uZWxzLmluY2x1ZGVzKHgpKVxuICBjb25uZWN0ZWRDaGFubmVscyA9IFsgLi4uYWN0aXZlQ2hhbm5lbHMgXVxuICBmb3IobGV0IGNoYW5uZWwgb2YgdG9Db25uZWN0KSB7XG4gICAgYXdhaXQgc2VuZChgKyR7Y2hhbm5lbH1gKVxuICB9XG59XG5cblxuLy8gREVQUkVDQVRFRDogbm8gVWludDhBcnJheXMgY3VycmVudGx5IGJlaW5nIHBhc3NlZFxuXG4vLyBmdW5jdGlvbiBnZXRTdHJpbmcoYXJyYXkpIHtcbi8vICAgdmFyIG91dCwgaSwgbGVuLCBjXG4vLyAgIHZhciBjaGFyMiwgY2hhcjNcblxuLy8gICBvdXQgPSBcIlwiXG4vLyAgIGxlbiA9IGFycmF5Lmxlbmd0aFxuLy8gICBpID0gMFxuLy8gICB3aGlsZSAoaSA8IGxlbikge1xuLy8gICAgIGMgPSBhcnJheVtpKytdXG4vLyAgICAgaWYgKGkgPiAwICYmIGMgPT09IDApIGJyZWFrXG4vLyAgICAgc3dpdGNoIChjID4+IDQpIHtcbi8vICAgICBjYXNlIDA6IGNhc2UgMTogY2FzZSAyOiBjYXNlIDM6IGNhc2UgNDogY2FzZSA1OiBjYXNlIDY6IGNhc2UgNzpcbi8vICAgICAgIC8vIDB4eHh4eHh4XG4vLyAgICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKVxuLy8gICAgICAgYnJlYWtcbi8vICAgICBjYXNlIDEyOiBjYXNlIDEzOlxuLy8gICAgICAgLy8gMTEweCB4eHh4ICAgMTB4eCB4eHh4XG4vLyAgICAgICBjaGFyMiA9IGFycmF5W2krK11cbi8vICAgICAgIG91dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMHgxRikgPDwgNiB8IGNoYXIyICYgMHgzRilcbi8vICAgICAgIGJyZWFrXG4vLyAgICAgY2FzZSAxNDpcbi8vICAgICAgIC8vIDExMTAgeHh4eCAgMTB4eCB4eHh4ICAxMHh4IHh4eHhcbi8vICAgICAgIGNoYXIyID0gYXJyYXlbaSsrXVxuLy8gICAgICAgY2hhcjMgPSBhcnJheVtpKytdXG4vLyAgICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyAmIDB4MEYpIDw8IDEyIHxcbi8vICAgICAgICAgICAoY2hhcjIgJiAweDNGKSA8PCA2IHxcbi8vICAgICAgICAgICAoY2hhcjMgJiAweDNGKSA8PCAwKVxuLy8gICAgICAgYnJlYWtcbi8vICAgICB9XG4vLyAgIH1cblxuLy8gICByZXR1cm4gb3V0XG4vLyB9XG5cblxuY29uc3QgaWQgPSAoKSA9PiB7XG4gIHJldHVybiAnXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSlcbn1cblxubGV0IGlkcyA9IHt9XG5cblxuXG5jb25zdCBwcm9jZXNzQ29tbWFuZCA9IGUgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc3RhcnQnKSB7XG4gICAgc29ja2V0VGFyZ2V0ID0gZGF0YS50YXJnZXRcbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ2Nvbm5lY3QnKSB7XG4gICAgYWRkUG9ydFN1YnNjcmlwdGlvbnMoZGF0YS5wb3J0LCBkYXRhLmNoYW5uZWxzKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnY2xvc2UnKSB7XG4gICAgaWYgKGRhdGEucG9ydCkge1xuICAgICAgcG9ydHMgPSBwb3J0cy5maWx0ZXIoeCA9PiB4LnBvcnQgIT0gcG9ydClcbiAgICB9XG4gIH1cbn1cblxub25tZXNzYWdlID0gZSA9PiB7XG4gIGNvbnN0IHsgZGF0YSB9ID0gZVxuICBpZihkYXRhLnBvcnQpIHtcbiAgICBjb25zdCBwb3J0ID0gZGF0YS5wb3J0XG4gICAgY29uc3QgY29ubmVjdGlvbklkID0gaWQoKVxuICAgIHBvcnQub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xuICAgICAgcHJvY2Vzc0NvbW1hbmQoZSlcbiAgICAgIGJ1ZmZlckNvbW1hbmRzKHBvcnQsIGUsIGNvbm5lY3Rpb25JZClcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzc0NvbW1hbmQoZSlcbiAgICBidWZmZXJDb21tYW5kcyhudWxsLCBlLCAnbWFpbicpXG4gIH1cbn1cblxuLy8gb25jb25uZWN0ID0gZnVuY3Rpb24oZSkge1xuXG4vLyAgIGNvbnN0IGNvbm5lY3Rpb25JZCA9IGlkKClcblxuLy8gICBjb25zdCBwb3J0ID0gZS5wb3J0c1swXVxuXG4vLyAgIHBvcnQub25tZXNzYWdlID0gYXN5bmMgZSA9PiB7XG4vLyAgICAgY29uc29sZS5sb2coZS5kYXRhKVxuLy8gICAgIGNvbnN0IHsgZGF0YSB9ID0gZVxuXG4vLyAgICAgaWYoZGF0YS5jb21tYW5kID09ICdzdGFydCcpIHtcbi8vICAgICAgIHNvY2tldFRhcmdldCA9IGRhdGEudGFyZ2V0XG4vLyAgICAgfVxuXG4vLyAgICAgaWYoZGF0YS5jb21tYW5kID09ICdjb25uZWN0Jykge1xuLy8gICAgICAgYWRkUG9ydFN1YnNjcmlwdGlvbnMocG9ydCwgZGF0YS5jaGFubmVscylcbi8vICAgICB9XG5cbi8vICAgICBpZihkYXRhLmNvbW1hbmQgPT0gJ2Nsb3NlJykge1xuLy8gICAgICAgcG9ydHMgPSBwb3J0cy5maWx0ZXIoeCA9PiB4LnBvcnQgIT0gcG9ydClcbi8vICAgICB9XG5cbi8vICAgICBidWZmZXJDb21tYW5kcyhwb3J0LCBlLCBjb25uZWN0aW9uSWQpXG4vLyAgIH1cbi8vIH0iXSwibmFtZXMiOlsicGJmIiwiUGJmIl0sIm1hcHBpbmdzIjoiOzs7RUFBQTtFQUNBLFFBQVksR0FBRyxVQUFVLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7RUFDN0QsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFDO0VBQ1YsRUFBRSxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLEVBQUM7RUFDcEMsRUFBRSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksRUFBQztFQUM1QixFQUFFLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxFQUFDO0VBQ3ZCLEVBQUUsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFDO0VBQ2hCLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBQztFQUNqQyxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFDO0VBQ3ZCLEVBQUUsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7QUFDNUI7RUFDQSxFQUFFLENBQUMsSUFBSSxFQUFDO0FBQ1I7RUFDQSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUM7RUFDL0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDaEIsRUFBRSxLQUFLLElBQUksS0FBSTtFQUNmLEVBQUUsT0FBTyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLEVBQUUsRUFBRTtBQUM5RTtFQUNBLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBQztFQUMvQixFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBQztFQUNoQixFQUFFLEtBQUssSUFBSSxLQUFJO0VBQ2YsRUFBRSxPQUFPLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxFQUFFO0FBQzlFO0VBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7RUFDZixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBSztFQUNqQixHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO0VBQ3pCLElBQUksT0FBTyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUM7RUFDOUMsR0FBRyxNQUFNO0VBQ1QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBQztFQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBSztFQUNqQixHQUFHO0VBQ0gsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztFQUNqRCxFQUFDO0FBQ0Q7RUFDQSxTQUFhLEdBQUcsVUFBVSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtFQUNyRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFDO0VBQ2IsRUFBRSxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLEVBQUM7RUFDcEMsRUFBRSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksRUFBQztFQUM1QixFQUFFLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxFQUFDO0VBQ3ZCLEVBQUUsSUFBSSxFQUFFLElBQUksSUFBSSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ2xFLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFDO0VBQ2pDLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDdkIsRUFBRSxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztBQUM3RDtFQUNBLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFDO0FBQ3pCO0VBQ0EsRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssUUFBUSxFQUFFO0VBQzFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUM1QixJQUFJLENBQUMsR0FBRyxLQUFJO0VBQ1osR0FBRyxNQUFNO0VBQ1QsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDOUMsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUMzQyxNQUFNLENBQUMsR0FBRTtFQUNULE1BQU0sQ0FBQyxJQUFJLEVBQUM7RUFDWixLQUFLO0VBQ0wsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxFQUFFO0VBQ3hCLE1BQU0sS0FBSyxJQUFJLEVBQUUsR0FBRyxFQUFDO0VBQ3JCLEtBQUssTUFBTTtFQUNYLE1BQU0sS0FBSyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFDO0VBQzFDLEtBQUs7RUFDTCxJQUFJLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDeEIsTUFBTSxDQUFDLEdBQUU7RUFDVCxNQUFNLENBQUMsSUFBSSxFQUFDO0VBQ1osS0FBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLElBQUksSUFBSSxFQUFFO0VBQzNCLE1BQU0sQ0FBQyxHQUFHLEVBQUM7RUFDWCxNQUFNLENBQUMsR0FBRyxLQUFJO0VBQ2QsS0FBSyxNQUFNLElBQUksQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLEVBQUU7RUFDL0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBQztFQUMvQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBSztFQUNuQixLQUFLLE1BQU07RUFDWCxNQUFNLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBQztFQUM1RCxNQUFNLENBQUMsR0FBRyxFQUFDO0VBQ1gsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxJQUFJLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFO0FBQ2xGO0VBQ0EsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUM7RUFDckIsRUFBRSxJQUFJLElBQUksS0FBSTtFQUNkLEVBQUUsT0FBTyxJQUFJLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFO0FBQ2pGO0VBQ0EsRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBRztFQUNuQzs7Ozs7OztFQ2xG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QU8sR0FBRyxDQUFDO0VBQ25CLEtBQUs7QUFDTDtFQUNBLElBQUksVUFBVSxFQUFFLFdBQVc7RUFDM0IsUUFBUSxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2hFLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDdEIsUUFBUSxPQUFPLEdBQUcsQ0FBQztFQUNuQixLQUFLO0FBQ0w7RUFDQSxJQUFJLFVBQVUsRUFBRSxTQUFTLFFBQVEsRUFBRTtFQUNuQyxRQUFRLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHO0VBQzFCLFlBQVksR0FBRyxFQUFFLENBQUMsQ0FBQztBQUNuQjtFQUNBLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLE9BQU8sR0FBRyxDQUFDO0VBQy9FLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLE9BQU8sR0FBRyxDQUFDO0VBQy9FLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLE9BQU8sR0FBRyxDQUFDO0VBQy9FLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxD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QyxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPO0VBQ3RGLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU87RUFDdEYsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTztFQUN0RixJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPO0VBQ3RGLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU87RUFDdEYsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7RUFDdEMsQ0FBQztBQUNEO0VBQ0EsU0FBUyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNwRCxJQUFJLElBQUksUUFBUTtFQUNoQixRQUFRLEdBQUcsSUFBSSxNQUFNLEdBQUcsQ0FBQztFQUN6QixRQUFRLEdBQUcsSUFBSSxRQUFRLEdBQUcsQ0FBQztFQUMzQixRQUFRLEdBQUcsSUFBSSxTQUFTLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUU7RUFDQTtFQUNBLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUMxQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3JGLENBQUM7QUFDRDtFQUNBLFNBQVMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtFQUMxRyxTQUFTLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDMUcsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0VBQzFHLFNBQVMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtFQUMxRyxTQUFTLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7RUFDMUcsU0FBUyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzFHLFNBQVMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUMxRyxTQUFTLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcs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QUFHLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUMvRCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztFQUN2RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztFQUN4RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztFQUN2RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztFQUN4RCxDQUFDLENBQUM7RUFDRixPQUFPLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNwQyxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNoRCxJQUFJLElBQUksR0FBRyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztFQUN4RSxJQUFJLElBQUksR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztFQUMxRSxJQUFJLElBQUksR0FBRyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztFQUN4RSxJQUFJLElBQUksR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztFQUMxRSxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDM0QsSUFBSSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzdELElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUMzRCxJQUFJLElBQUksR0FBRyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7RUFDN0QsQ0FBQyxDQUFDO0FBQ0Y7RUFDQTtBQUNBO0VBQ08sTUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQztBQUMxQztFQUNBLE1BQU0sQ0FBQyxJQUFJLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ2xDLElBQUksT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztFQUNyRyxDQUFDLENBQUM7RUFDRixNQUFNLENBQUMsVUFBVSxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDN0MsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDN0MsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDeEQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDeEQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3ZELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN2RCxDQUFDLENBQUM7RUFDRixNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNuQyxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNoRCxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUM1RCxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUM1RCxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNsRCxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNsRCxDQUFDLENBQUM7QUFDRjtFQUNBO0FBQ0E7RUFDTyxNQUFNLE9BQU8sR0FBcUIsRUFBRSxDQUFDO0FBQzVDO0VBQ0EsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDbkMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQ2xNLENBQUMsQ0FBQztFQUNGLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUM5QyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUM3QyxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUNyRCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUM1RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDNUQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzFELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM3RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDNUQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzlELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDO0VBQ3RGLFNBQVMsSUFBSSxHQUFHLEtBQUssRUFBRSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQztFQUNsRyxDQUFDLENBQUM7RUFDRixPQUFPLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNwQyxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNoRCxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUN0RCxJQUFJLElBQUksR0FBRyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztFQUNwRSxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUM1RCxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUN4RCxJQUFJLElBQUksR0FBRyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztFQUM5RCxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUM1RCxJQUFJLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztFQUNoRSxJQUFJLElBQUksR0FBRyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztFQUNwRSxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM5RCxDQUFDLENBQUM7QUFDRjtFQUNBO0FBQ0E7RUFDTyxNQUFNLEtBQUssR0FBbUIsRUFBRSxDQUFDO0FBQ3hDO0VBQ0EsS0FBSyxDQUFDLElBQUksR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDakMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQzVFLENBQUMsQ0FBQztFQUNGLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUM1QyxJQUFJLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDckQsU0FBUyxJQUFJLEdBQUcsS0FBSyxHQUFHLEVBQUUsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDNUQsQ0FBQyxDQUFDO0VBQ0YsS0FBSyxDQUFDLEtBQUssR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDbEMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDdEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7RUFDbEUsQ0FBQyxDQUFDO0FBQ0Y7RUFDQTtBQUNBO0VBQ08sTUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQztBQUMxQztFQUNBLE1BQU0sQ0FBQyxJQUFJLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ2xDLElBQUksT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDakcsQ0FBQyxDQUFDO0VBQ0YsTUFBTSxDQUFDLFVBQVUsR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQzdDLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzdDLFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxR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
