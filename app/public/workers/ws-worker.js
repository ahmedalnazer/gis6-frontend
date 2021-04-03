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

  const maxChunkSize = 200;

  let buffer = [];

  var dataBuffer = buffer;

  buffer.write = function ({ ts, data }) {

    // simulate 450 zones
    // data = data.concat(data).concat(data)

    const date = new Date(ts);
    const frame = { data, date, time: ts };

    // buffer.push(frame)
    tween(frame, 12);

    buffer = buffer.slice(-7500);
  };


  let intervals = {};
  let latest = {};
  let earliest = {};

  const bufferCommands = (port, e, id) => {
    const { data } = e;
    
    if (data.command == 'readBuffer') {

      // send data in batches, limiting max to avoid OOM when serializing to
      // pass between threads
      const sendChunk = () => {
        if (!latest[id] && buffer.length) {
          latest[id] = buffer[buffer.length - 1] && buffer[buffer.length - 1].time;
          earliest[id] = latest[id] + 1;
        }
        
        if(latest[id]) {
          const newest = buffer.filter(x => x.time > latest[id]);
          const backFill = buffer.filter(x => x.time < earliest[id]).slice(-(maxChunkSize - newest.length));
          const update = backFill.concat(newest);
          // console.log(backFill.length, newest.length)
          if (update.length) {
            const latestEntry = update[update.length - 1];
            const firstEntry = update[0];
            latest[id] = latestEntry.time;
            if(firstEntry.time < earliest[id]) earliest[id] = firstEntry.time;
            port.postMessage({ update });
          }
        }
        // console.log(sizeOf([ ...buffer ]))
      };

      intervals[id] = setInterval(sendChunk, 500);
    }

    if (data.command = 'setBufferParams') {
      data.params;
    }

    if (data.command == 'close') {
      clearInterval(intervals[id]);
      latest[id] = 0;
    }
  };






  // utilities for testing

  const tween = (next, frames) => {

    let frameList = [];
    for (let i = 1; i < frames; i++) {
      frameList.push(i);
    }

    const { time, data } = next;
    const lastBuffer = buffer[buffer.length - 1];

    // test tweening
    if (lastBuffer) {
      for (let x of frameList) {
        let tween = [];
        for (let i = 0; i < lastBuffer.data.length; i++) {
          const last = lastBuffer.data[i];
          const current = data[i];
          if (last && current) {
            let tweened = { ...current };
            for (let prop of [ 'actual_temp', 'actual_current', 'actual_percent' ]) {
              // console.log(prop)
              const delta = (current[prop] - last[prop]) / frames;
              tweened[prop] = last[prop] + delta * x;
            }
            tween.push(tweened);
          }
        }
        const offset = 500 / frames * x;
        const updatedTS = time - 500 + offset;
        const date = new Date(updatedTS);
        setTimeout(() => buffer.push({ time: updatedTS, date, data: tween }), offset);
      }
    }
    setTimeout(() => buffer.push(next), 500);
  };

  const messageTypes = { tcdata, minmax, unknown_msg, tczone, sysinfo, mdtmsg };

  let socket;
  let ports = [];

  let connectedChannels = [];
  let activeChannels = [];

  const updateActive = async () => {
    activeChannels = [];
    for(let p of ports) {
      console.log(p.subscriptions);
      activeChannels = activeChannels.concat(p.subscriptions);
    }
    activeChannels = [ ... new Set(activeChannels) ];
    for(let c of connectedChannels) {
      if(!activeChannels.includes(c)) {
        await send(`-${c}`);
      }
    }
    console.log(ports);
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


  const createSocket = () => new Promise((resolve, reject) => {
    if(ready) resolve();
    if(!socket) {
      socket = new WebSocket(socketTarget);
      
      socket.addEventListener('open', e => {
        console.log('connecting');
        initiate();
        // connect()
      });

      socket.addEventListener('message', async e => {
        // console.log(e)
        const ts = new Date();

        const buffer = await e.data.arrayBuffer();
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

        for(let key of Object.keys(data)) {
          if(data[key] && data[key].constructor === Uint8Array) {
            data[key] = getString(data[key]);
          }
        }

        // ports[0].port.postMessage(data)

        if(mt == 6) {
          dataBuffer.write({ ts, data: data.records });
        }

        for(let { port, subscriptions } of ports) {
          if(subscriptions.includes(type)) {
            port.postMessage({ ts, data });
          }
        }
        // postMessage(data)
      });

      socket.addEventListener('close', e => {
        console.log('Socket connection lost!');
        ready = false;
        socket = null;
        connectedChannels = [];
        setTimeout(() => {
          console.log('retrying');
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


  function getString(array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while (i < len) {
      c = array[i++];
      if (i > 0 && c === 0) break
      switch (c >> 4) {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode((c & 0x1F) << 6 | char2 & 0x3F);
        break
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode((c & 0x0F) << 12 |
            (char2 & 0x3F) << 6 |
            (char3 & 0x3F) << 0);
        break
      }
    }

    return out
  }


  const id = () => {
    return '_' + Math.random().toString(36).substr(2, 9)
  };

  onconnect = function(e) {

    const connectionId = id();

    const port = e.ports[0];

    port.onmessage = async e => {
      console.log(e.data);
      const { data } = e;

      if(data.command == 'start') {
        socketTarget = data.target;
      }

      if(data.command == 'connect') {
        addPortSubscriptions(port, data.channels);
      }

      if(data.command == 'close') {
        ports = ports.filter(x => x.port != port);
      }

      bufferCommands(port, e, connectionId);
    };
  };

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3Mtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9wYmYvaW5kZXguanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS9kZWNvZGUucHJvdG8uanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9yZWFsdGltZS93cy13b3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohIGllZWU3NTQuIEJTRC0zLUNsYXVzZSBMaWNlbnNlLiBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmcvb3BlbnNvdXJjZT4gKi9cbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gKGUgKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gKG0gKiAyNTYpICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAoKHZhbHVlICogYykgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBQYmY7XG5cbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpO1xuXG5mdW5jdGlvbiBQYmYoYnVmKSB7XG4gICAgdGhpcy5idWYgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgJiYgQXJyYXlCdWZmZXIuaXNWaWV3KGJ1ZikgPyBidWYgOiBuZXcgVWludDhBcnJheShidWYgfHwgMCk7XG4gICAgdGhpcy5wb3MgPSAwO1xuICAgIHRoaXMudHlwZSA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLmJ1Zi5sZW5ndGg7XG59XG5cblBiZi5WYXJpbnQgID0gMDsgLy8gdmFyaW50OiBpbnQzMiwgaW50NjQsIHVpbnQzMiwgdWludDY0LCBzaW50MzIsIHNpbnQ2NCwgYm9vbCwgZW51bVxuUGJmLkZpeGVkNjQgPSAxOyAvLyA2NC1iaXQ6IGRvdWJsZSwgZml4ZWQ2NCwgc2ZpeGVkNjRcblBiZi5CeXRlcyAgID0gMjsgLy8gbGVuZ3RoLWRlbGltaXRlZDogc3RyaW5nLCBieXRlcywgZW1iZWRkZWQgbWVzc2FnZXMsIHBhY2tlZCByZXBlYXRlZCBmaWVsZHNcblBiZi5GaXhlZDMyID0gNTsgLy8gMzItYml0OiBmbG9hdCwgZml4ZWQzMiwgc2ZpeGVkMzJcblxudmFyIFNISUZUX0xFRlRfMzIgPSAoMSA8PCAxNikgKiAoMSA8PCAxNiksXG4gICAgU0hJRlRfUklHSFRfMzIgPSAxIC8gU0hJRlRfTEVGVF8zMjtcblxuLy8gVGhyZXNob2xkIGNob3NlbiBiYXNlZCBvbiBib3RoIGJlbmNobWFya2luZyBhbmQga25vd2xlZGdlIGFib3V0IGJyb3dzZXIgc3RyaW5nXG4vLyBkYXRhIHN0cnVjdHVyZXMgKHdoaWNoIGN1cnJlbnRseSBzd2l0Y2ggc3RydWN0dXJlIHR5cGVzIGF0IDEyIGJ5dGVzIG9yIG1vcmUpXG52YXIgVEVYVF9ERUNPREVSX01JTl9MRU5HVEggPSAxMjtcbnZhciB1dGY4VGV4dERlY29kZXIgPSB0eXBlb2YgVGV4dERlY29kZXIgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IG5ldyBUZXh0RGVjb2RlcigndXRmOCcpO1xuXG5QYmYucHJvdG90eXBlID0ge1xuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuYnVmID0gbnVsbDtcbiAgICB9LFxuXG4gICAgLy8gPT09IFJFQURJTkcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIHJlYWRGaWVsZHM6IGZ1bmN0aW9uKHJlYWRGaWVsZCwgcmVzdWx0LCBlbmQpIHtcbiAgICAgICAgZW5kID0gZW5kIHx8IHRoaXMubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgdmFyIHZhbCA9IHRoaXMucmVhZFZhcmludCgpLFxuICAgICAgICAgICAgICAgIHRhZyA9IHZhbCA+PiAzLFxuICAgICAgICAgICAgICAgIHN0YXJ0UG9zID0gdGhpcy5wb3M7XG5cbiAgICAgICAgICAgIHRoaXMudHlwZSA9IHZhbCAmIDB4NztcbiAgICAgICAgICAgIHJlYWRGaWVsZCh0YWcsIHJlc3VsdCwgdGhpcyk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA9PT0gc3RhcnRQb3MpIHRoaXMuc2tpcCh2YWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIHJlYWRNZXNzYWdlOiBmdW5jdGlvbihyZWFkRmllbGQsIHJlc3VsdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWFkRmllbGRzKHJlYWRGaWVsZCwgcmVzdWx0LCB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zKTtcbiAgICB9LFxuXG4gICAgcmVhZEZpeGVkMzI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gcmVhZFVJbnQzMih0aGlzLmJ1ZiwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkU0ZpeGVkMzI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gcmVhZEludDMyKHRoaXMuYnVmLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIC8vIDY0LWJpdCBpbnQgaGFuZGxpbmcgaXMgYmFzZWQgb24gZ2l0aHViLmNvbS9kcHcvbm9kZS1idWZmZXItbW9yZS1pbnRzIChNSVQtbGljZW5zZWQpXG5cbiAgICByZWFkRml4ZWQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSByZWFkVUludDMyKHRoaXMuYnVmLCB0aGlzLnBvcykgKyByZWFkVUludDMyKHRoaXMuYnVmLCB0aGlzLnBvcyArIDQpICogU0hJRlRfTEVGVF8zMjtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9LFxuXG4gICAgcmVhZFNGaXhlZDY0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbCA9IHJlYWRVSW50MzIodGhpcy5idWYsIHRoaXMucG9zKSArIHJlYWRJbnQzMih0aGlzLmJ1ZiwgdGhpcy5wb3MgKyA0KSAqIFNISUZUX0xFRlRfMzI7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWRGbG9hdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSBpZWVlNzU0LnJlYWQodGhpcy5idWYsIHRoaXMucG9zLCB0cnVlLCAyMywgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWREb3VibGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gaWVlZTc1NC5yZWFkKHRoaXMuYnVmLCB0aGlzLnBvcywgdHJ1ZSwgNTIsIDgpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkVmFyaW50OiBmdW5jdGlvbihpc1NpZ25lZCkge1xuICAgICAgICB2YXIgYnVmID0gdGhpcy5idWYsXG4gICAgICAgICAgICB2YWwsIGI7XG5cbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICA9ICBiICYgMHg3ZjsgICAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgNzsgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgMTQ7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsIHw9IChiICYgMHg3ZikgPDwgMjE7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvc107ICAgdmFsIHw9IChiICYgMHgwZikgPDwgMjg7XG5cbiAgICAgICAgcmV0dXJuIHJlYWRWYXJpbnRSZW1haW5kZXIodmFsLCBpc1NpZ25lZCwgdGhpcyk7XG4gICAgfSxcblxuICAgIHJlYWRWYXJpbnQ2NDogZnVuY3Rpb24oKSB7IC8vIGZvciBjb21wYXRpYmlsaXR5IHdpdGggdjIuMC4xXG4gICAgICAgIHJldHVybiB0aGlzLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgfSxcblxuICAgIHJlYWRTVmFyaW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG51bSA9IHRoaXMucmVhZFZhcmludCgpO1xuICAgICAgICByZXR1cm4gbnVtICUgMiA9PT0gMSA/IChudW0gKyAxKSAvIC0yIDogbnVtIC8gMjsgLy8gemlnemFnIGVuY29kaW5nXG4gICAgfSxcblxuICAgIHJlYWRCb29sZWFuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4odGhpcy5yZWFkVmFyaW50KCkpO1xuICAgIH0sXG5cbiAgICByZWFkU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3M7XG4gICAgICAgIHZhciBwb3MgPSB0aGlzLnBvcztcbiAgICAgICAgdGhpcy5wb3MgPSBlbmQ7XG5cbiAgICAgICAgaWYgKGVuZCAtIHBvcyA+PSBURVhUX0RFQ09ERVJfTUlOX0xFTkdUSCAmJiB1dGY4VGV4dERlY29kZXIpIHtcbiAgICAgICAgICAgIC8vIGxvbmdlciBzdHJpbmdzIGFyZSBmYXN0IHdpdGggdGhlIGJ1aWx0LWluIGJyb3dzZXIgVGV4dERlY29kZXIgQVBJXG4gICAgICAgICAgICByZXR1cm4gcmVhZFV0ZjhUZXh0RGVjb2Rlcih0aGlzLmJ1ZiwgcG9zLCBlbmQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNob3J0IHN0cmluZ3MgYXJlIGZhc3Qgd2l0aCBvdXIgY3VzdG9tIGltcGxlbWVudGF0aW9uXG4gICAgICAgIHJldHVybiByZWFkVXRmOCh0aGlzLmJ1ZiwgcG9zLCBlbmQpO1xuICAgIH0sXG5cbiAgICByZWFkQnl0ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcyxcbiAgICAgICAgICAgIGJ1ZmZlciA9IHRoaXMuYnVmLnN1YmFycmF5KHRoaXMucG9zLCBlbmQpO1xuICAgICAgICB0aGlzLnBvcyA9IGVuZDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9LFxuXG4gICAgLy8gdmVyYm9zZSBmb3IgcGVyZm9ybWFuY2UgcmVhc29uczsgZG9lc24ndCBhZmZlY3QgZ3ppcHBlZCBzaXplXG5cbiAgICByZWFkUGFja2VkVmFyaW50OiBmdW5jdGlvbihhcnIsIGlzU2lnbmVkKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZFZhcmludChpc1NpZ25lZCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFZhcmludChpc1NpZ25lZCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZFNWYXJpbnQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRTVmFyaW50KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFNWYXJpbnQoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkQm9vbGVhbjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEJvb2xlYW4oKSk7XG4gICAgICAgIHZhciBlbmQgPSByZWFkUGFja2VkRW5kKHRoaXMpO1xuICAgICAgICBhcnIgPSBhcnIgfHwgW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkQm9vbGVhbigpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRGbG9hdDogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEZsb2F0KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEZsb2F0KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZERvdWJsZTogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZERvdWJsZSgpKTtcbiAgICAgICAgdmFyIGVuZCA9IHJlYWRQYWNrZWRFbmQodGhpcyk7XG4gICAgICAgIGFyciA9IGFyciB8fCBbXTtcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zIDwgZW5kKSBhcnIucHVzaCh0aGlzLnJlYWREb3VibGUoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRml4ZWQzMjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZEZpeGVkMzIoKSk7XG4gICAgICAgIHZhciBlbmQgPSByZWFkUGFja2VkRW5kKHRoaXMpO1xuICAgICAgICBhcnIgPSBhcnIgfHwgW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkRml4ZWQzMigpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRTRml4ZWQzMjogZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT09IFBiZi5CeXRlcykgcmV0dXJuIGFyci5wdXNoKHRoaXMucmVhZFNGaXhlZDMyKCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFNGaXhlZDMyKCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZEZpeGVkNjQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRGaXhlZDY0KCkpO1xuICAgICAgICB2YXIgZW5kID0gcmVhZFBhY2tlZEVuZCh0aGlzKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEZpeGVkNjQoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkU0ZpeGVkNjQ6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9PSBQYmYuQnl0ZXMpIHJldHVybiBhcnIucHVzaCh0aGlzLnJlYWRTRml4ZWQ2NCgpKTtcbiAgICAgICAgdmFyIGVuZCA9IHJlYWRQYWNrZWRFbmQodGhpcyk7XG4gICAgICAgIGFyciA9IGFyciB8fCBbXTtcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zIDwgZW5kKSBhcnIucHVzaCh0aGlzLnJlYWRTRml4ZWQ2NCgpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuXG4gICAgc2tpcDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHZhciB0eXBlID0gdmFsICYgMHg3O1xuICAgICAgICBpZiAodHlwZSA9PT0gUGJmLlZhcmludCkgd2hpbGUgKHRoaXMuYnVmW3RoaXMucG9zKytdID4gMHg3Zikge31cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gUGJmLkJ5dGVzKSB0aGlzLnBvcyA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3M7XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFBiZi5GaXhlZDMyKSB0aGlzLnBvcyArPSA0O1xuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBQYmYuRml4ZWQ2NCkgdGhpcy5wb3MgKz0gODtcbiAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ1VuaW1wbGVtZW50ZWQgdHlwZTogJyArIHR5cGUpO1xuICAgIH0sXG5cbiAgICAvLyA9PT0gV1JJVElORyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgd3JpdGVUYWc6IGZ1bmN0aW9uKHRhZywgdHlwZSkge1xuICAgICAgICB0aGlzLndyaXRlVmFyaW50KCh0YWcgPDwgMykgfCB0eXBlKTtcbiAgICB9LFxuXG4gICAgcmVhbGxvYzogZnVuY3Rpb24obWluKSB7XG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAxNjtcblxuICAgICAgICB3aGlsZSAobGVuZ3RoIDwgdGhpcy5wb3MgKyBtaW4pIGxlbmd0aCAqPSAyO1xuXG4gICAgICAgIGlmIChsZW5ndGggIT09IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgIGJ1Zi5zZXQodGhpcy5idWYpO1xuICAgICAgICAgICAgdGhpcy5idWYgPSBidWY7XG4gICAgICAgICAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBmaW5pc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IHRoaXMucG9zO1xuICAgICAgICB0aGlzLnBvcyA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzLmJ1Zi5zdWJhcnJheSgwLCB0aGlzLmxlbmd0aCk7XG4gICAgfSxcblxuICAgIHdyaXRlRml4ZWQzMjogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg0KTtcbiAgICAgICAgd3JpdGVJbnQzMih0aGlzLmJ1ZiwgdmFsLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfSxcblxuICAgIHdyaXRlU0ZpeGVkMzI6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLnJlYWxsb2MoNCk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIHZhbCwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH0sXG5cbiAgICB3cml0ZUZpeGVkNjQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLnJlYWxsb2MoOCk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIHZhbCAmIC0xLCB0aGlzLnBvcyk7XG4gICAgICAgIHdyaXRlSW50MzIodGhpcy5idWYsIE1hdGguZmxvb3IodmFsICogU0hJRlRfUklHSFRfMzIpLCB0aGlzLnBvcyArIDQpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgIH0sXG5cbiAgICB3cml0ZVNGaXhlZDY0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDgpO1xuICAgICAgICB3cml0ZUludDMyKHRoaXMuYnVmLCB2YWwgJiAtMSwgdGhpcy5wb3MpO1xuICAgICAgICB3cml0ZUludDMyKHRoaXMuYnVmLCBNYXRoLmZsb29yKHZhbCAqIFNISUZUX1JJR0hUXzMyKSwgdGhpcy5wb3MgKyA0KTtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICB9LFxuXG4gICAgd3JpdGVWYXJpbnQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB2YWwgPSArdmFsIHx8IDA7XG5cbiAgICAgICAgaWYgKHZhbCA+IDB4ZmZmZmZmZiB8fCB2YWwgPCAwKSB7XG4gICAgICAgICAgICB3cml0ZUJpZ1ZhcmludCh2YWwsIHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuXG4gICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gICAgICAgICAgIHZhbCAmIDB4N2YgIHwgKHZhbCA+IDB4N2YgPyAweDgwIDogMCk7IGlmICh2YWwgPD0gMHg3ZikgcmV0dXJuO1xuICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+Pj0gNykgJiAweDdmKSB8ICh2YWwgPiAweDdmID8gMHg4MCA6IDApOyBpZiAodmFsIDw9IDB4N2YpIHJldHVybjtcbiAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj49IDcpICYgMHg3ZikgfCAodmFsID4gMHg3ZiA/IDB4ODAgOiAwKTsgaWYgKHZhbCA8PSAweDdmKSByZXR1cm47XG4gICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gICAodmFsID4+PiA3KSAmIDB4N2Y7XG4gICAgfSxcblxuICAgIHdyaXRlU1ZhcmludDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQodmFsIDwgMCA/IC12YWwgKiAyIC0gMSA6IHZhbCAqIDIpO1xuICAgIH0sXG5cbiAgICB3cml0ZUJvb2xlYW46IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVmFyaW50KEJvb2xlYW4odmFsKSk7XG4gICAgfSxcblxuICAgIHdyaXRlU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgc3RyID0gU3RyaW5nKHN0cik7XG4gICAgICAgIHRoaXMucmVhbGxvYyhzdHIubGVuZ3RoICogNCk7XG5cbiAgICAgICAgdGhpcy5wb3MrKzsgLy8gcmVzZXJ2ZSAxIGJ5dGUgZm9yIHNob3J0IHN0cmluZyBsZW5ndGhcblxuICAgICAgICB2YXIgc3RhcnRQb3MgPSB0aGlzLnBvcztcbiAgICAgICAgLy8gd3JpdGUgdGhlIHN0cmluZyBkaXJlY3RseSB0byB0aGUgYnVmZmVyIGFuZCBzZWUgaG93IG11Y2ggd2FzIHdyaXR0ZW5cbiAgICAgICAgdGhpcy5wb3MgPSB3cml0ZVV0ZjgodGhpcy5idWYsIHN0ciwgdGhpcy5wb3MpO1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5wb3MgLSBzdGFydFBvcztcblxuICAgICAgICBpZiAobGVuID49IDB4ODApIG1ha2VSb29tRm9yRXh0cmFMZW5ndGgoc3RhcnRQb3MsIGxlbiwgdGhpcyk7XG5cbiAgICAgICAgLy8gZmluYWxseSwgd3JpdGUgdGhlIG1lc3NhZ2UgbGVuZ3RoIGluIHRoZSByZXNlcnZlZCBwbGFjZSBhbmQgcmVzdG9yZSB0aGUgcG9zaXRpb25cbiAgICAgICAgdGhpcy5wb3MgPSBzdGFydFBvcyAtIDE7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQobGVuKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gbGVuO1xuICAgIH0sXG5cbiAgICB3cml0ZUZsb2F0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuICAgICAgICBpZWVlNzU0LndyaXRlKHRoaXMuYnVmLCB2YWwsIHRoaXMucG9zLCB0cnVlLCAyMywgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfSxcblxuICAgIHdyaXRlRG91YmxlOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDgpO1xuICAgICAgICBpZWVlNzU0LndyaXRlKHRoaXMuYnVmLCB2YWwsIHRoaXMucG9zLCB0cnVlLCA1MiwgOCk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfSxcblxuICAgIHdyaXRlQnl0ZXM6IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICB2YXIgbGVuID0gYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChsZW4pO1xuICAgICAgICB0aGlzLnJlYWxsb2MobGVuKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgdGhpcy5idWZbdGhpcy5wb3MrK10gPSBidWZmZXJbaV07XG4gICAgfSxcblxuICAgIHdyaXRlUmF3TWVzc2FnZTogZnVuY3Rpb24oZm4sIG9iaikge1xuICAgICAgICB0aGlzLnBvcysrOyAvLyByZXNlcnZlIDEgYnl0ZSBmb3Igc2hvcnQgbWVzc2FnZSBsZW5ndGhcblxuICAgICAgICAvLyB3cml0ZSB0aGUgbWVzc2FnZSBkaXJlY3RseSB0byB0aGUgYnVmZmVyIGFuZCBzZWUgaG93IG11Y2ggd2FzIHdyaXR0ZW5cbiAgICAgICAgdmFyIHN0YXJ0UG9zID0gdGhpcy5wb3M7XG4gICAgICAgIGZuKG9iaiwgdGhpcyk7XG4gICAgICAgIHZhciBsZW4gPSB0aGlzLnBvcyAtIHN0YXJ0UG9zO1xuXG4gICAgICAgIGlmIChsZW4gPj0gMHg4MCkgbWFrZVJvb21Gb3JFeHRyYUxlbmd0aChzdGFydFBvcywgbGVuLCB0aGlzKTtcblxuICAgICAgICAvLyBmaW5hbGx5LCB3cml0ZSB0aGUgbWVzc2FnZSBsZW5ndGggaW4gdGhlIHJlc2VydmVkIHBsYWNlIGFuZCByZXN0b3JlIHRoZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0UG9zIC0gMTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChsZW4pO1xuICAgICAgICB0aGlzLnBvcyArPSBsZW47XG4gICAgfSxcblxuICAgIHdyaXRlTWVzc2FnZTogZnVuY3Rpb24odGFnLCBmbiwgb2JqKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlUmF3TWVzc2FnZShmbiwgb2JqKTtcbiAgICB9LFxuXG4gICAgd3JpdGVQYWNrZWRWYXJpbnQ6ICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRWYXJpbnQsIGFycik7ICAgfSxcbiAgICB3cml0ZVBhY2tlZFNWYXJpbnQ6ICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZFNWYXJpbnQsIGFycik7ICB9LFxuICAgIHdyaXRlUGFja2VkQm9vbGVhbjogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkQm9vbGVhbiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRGbG9hdDogICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRGbG9hdCwgYXJyKTsgICAgfSxcbiAgICB3cml0ZVBhY2tlZERvdWJsZTogICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZERvdWJsZSwgYXJyKTsgICB9LFxuICAgIHdyaXRlUGFja2VkRml4ZWQzMjogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkRml4ZWQzMiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRTRml4ZWQzMjogZnVuY3Rpb24odGFnLCBhcnIpIHsgaWYgKGFyci5sZW5ndGgpIHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRTRml4ZWQzMiwgYXJyKTsgfSxcbiAgICB3cml0ZVBhY2tlZEZpeGVkNjQ6ICBmdW5jdGlvbih0YWcsIGFycikgeyBpZiAoYXJyLmxlbmd0aCkgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZEZpeGVkNjQsIGFycik7ICB9LFxuICAgIHdyaXRlUGFja2VkU0ZpeGVkNjQ6IGZ1bmN0aW9uKHRhZywgYXJyKSB7IGlmIChhcnIubGVuZ3RoKSB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkU0ZpeGVkNjQsIGFycik7IH0sXG5cbiAgICB3cml0ZUJ5dGVzRmllbGQ6IGZ1bmN0aW9uKHRhZywgYnVmZmVyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlQnl0ZXMoYnVmZmVyKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQzMih2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkMzIodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQ2NCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkNjQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVNWYXJpbnQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlU3RyaW5nRmllbGQ6IGZ1bmN0aW9uKHRhZywgc3RyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlU3RyaW5nKHN0cik7XG4gICAgfSxcbiAgICB3cml0ZUZsb2F0RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuRml4ZWQzMik7XG4gICAgICAgIHRoaXMud3JpdGVGbG9hdCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVEb3VibGVGaWVsZDogZnVuY3Rpb24odGFnLCB2YWwpIHtcbiAgICAgICAgdGhpcy53cml0ZVRhZyh0YWcsIFBiZi5GaXhlZDY0KTtcbiAgICAgICAgdGhpcy53cml0ZURvdWJsZSh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVCb29sZWFuRmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnRGaWVsZCh0YWcsIEJvb2xlYW4odmFsKSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gcmVhZFZhcmludFJlbWFpbmRlcihsLCBzLCBwKSB7XG4gICAgdmFyIGJ1ZiA9IHAuYnVmLFxuICAgICAgICBoLCBiO1xuXG4gICAgYiA9IGJ1ZltwLnBvcysrXTsgaCAgPSAoYiAmIDB4NzApID4+IDQ7ICBpZiAoYiA8IDB4ODApIHJldHVybiB0b051bShsLCBoLCBzKTtcbiAgICBiID0gYnVmW3AucG9zKytdOyBoIHw9IChiICYgMHg3ZikgPDwgMzsgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHRvTnVtKGwsIGgsIHMpO1xuICAgIGIgPSBidWZbcC5wb3MrK107IGggfD0gKGIgJiAweDdmKSA8PCAxMDsgaWYgKGIgPCAweDgwKSByZXR1cm4gdG9OdW0obCwgaCwgcyk7XG4gICAgYiA9IGJ1ZltwLnBvcysrXTsgaCB8PSAoYiAmIDB4N2YpIDw8IDE3OyBpZiAoYiA8IDB4ODApIHJldHVybiB0b051bShsLCBoLCBzKTtcbiAgICBiID0gYnVmW3AucG9zKytdOyBoIHw9IChiICYgMHg3ZikgPDwgMjQ7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHRvTnVtKGwsIGgsIHMpO1xuICAgIGIgPSBidWZbcC5wb3MrK107IGggfD0gKGIgJiAweDAxKSA8PCAzMTsgaWYgKGIgPCAweDgwKSByZXR1cm4gdG9OdW0obCwgaCwgcyk7XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHZhcmludCBub3QgbW9yZSB0aGFuIDEwIGJ5dGVzJyk7XG59XG5cbmZ1bmN0aW9uIHJlYWRQYWNrZWRFbmQocGJmKSB7XG4gICAgcmV0dXJuIHBiZi50eXBlID09PSBQYmYuQnl0ZXMgP1xuICAgICAgICBwYmYucmVhZFZhcmludCgpICsgcGJmLnBvcyA6IHBiZi5wb3MgKyAxO1xufVxuXG5mdW5jdGlvbiB0b051bShsb3csIGhpZ2gsIGlzU2lnbmVkKSB7XG4gICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgIHJldHVybiBoaWdoICogMHgxMDAwMDAwMDAgKyAobG93ID4+PiAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKChoaWdoID4+PiAwKSAqIDB4MTAwMDAwMDAwKSArIChsb3cgPj4+IDApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJpZ1ZhcmludCh2YWwsIHBiZikge1xuICAgIHZhciBsb3csIGhpZ2g7XG5cbiAgICBpZiAodmFsID49IDApIHtcbiAgICAgICAgbG93ICA9ICh2YWwgJSAweDEwMDAwMDAwMCkgfCAwO1xuICAgICAgICBoaWdoID0gKHZhbCAvIDB4MTAwMDAwMDAwKSB8IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbG93ICA9IH4oLXZhbCAlIDB4MTAwMDAwMDAwKTtcbiAgICAgICAgaGlnaCA9IH4oLXZhbCAvIDB4MTAwMDAwMDAwKTtcblxuICAgICAgICBpZiAobG93IF4gMHhmZmZmZmZmZikge1xuICAgICAgICAgICAgbG93ID0gKGxvdyArIDEpIHwgMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvdyA9IDA7XG4gICAgICAgICAgICBoaWdoID0gKGhpZ2ggKyAxKSB8IDA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFsID49IDB4MTAwMDAwMDAwMDAwMDAwMDAgfHwgdmFsIDwgLTB4MTAwMDAwMDAwMDAwMDAwMDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdHaXZlbiB2YXJpbnQgZG9lc25cXCd0IGZpdCBpbnRvIDEwIGJ5dGVzJyk7XG4gICAgfVxuXG4gICAgcGJmLnJlYWxsb2MoMTApO1xuXG4gICAgd3JpdGVCaWdWYXJpbnRMb3cobG93LCBoaWdoLCBwYmYpO1xuICAgIHdyaXRlQmlnVmFyaW50SGlnaChoaWdoLCBwYmYpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJpZ1ZhcmludExvdyhsb3csIGhpZ2gsIHBiZikge1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSA9IGxvdyAmIDB4N2YgfCAweDgwOyBsb3cgPj4+PSA3O1xuICAgIHBiZi5idWZbcGJmLnBvc10gICA9IGxvdyAmIDB4N2Y7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmlnVmFyaW50SGlnaChoaWdoLCBwYmYpIHtcbiAgICB2YXIgbHNiID0gKGhpZ2ggJiAweDA3KSA8PCA0O1xuXG4gICAgcGJmLmJ1ZltwYmYucG9zKytdIHw9IGxzYiAgICAgICAgIHwgKChoaWdoID4+Pj0gMykgPyAweDgwIDogMCk7IGlmICghaGlnaCkgcmV0dXJuO1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSAgPSBoaWdoICYgMHg3ZiB8ICgoaGlnaCA+Pj49IDcpID8gMHg4MCA6IDApOyBpZiAoIWhpZ2gpIHJldHVybjtcbiAgICBwYmYuYnVmW3BiZi5wb3MrK10gID0gaGlnaCAmIDB4N2YgfCAoKGhpZ2ggPj4+PSA3KSA/IDB4ODAgOiAwKTsgaWYgKCFoaWdoKSByZXR1cm47XG4gICAgcGJmLmJ1ZltwYmYucG9zKytdICA9IGhpZ2ggJiAweDdmIHwgKChoaWdoID4+Pj0gNykgPyAweDgwIDogMCk7IGlmICghaGlnaCkgcmV0dXJuO1xuICAgIHBiZi5idWZbcGJmLnBvcysrXSAgPSBoaWdoICYgMHg3ZiB8ICgoaGlnaCA+Pj49IDcpID8gMHg4MCA6IDApOyBpZiAoIWhpZ2gpIHJldHVybjtcbiAgICBwYmYuYnVmW3BiZi5wb3MrK10gID0gaGlnaCAmIDB4N2Y7XG59XG5cbmZ1bmN0aW9uIG1ha2VSb29tRm9yRXh0cmFMZW5ndGgoc3RhcnRQb3MsIGxlbiwgcGJmKSB7XG4gICAgdmFyIGV4dHJhTGVuID1cbiAgICAgICAgbGVuIDw9IDB4M2ZmZiA/IDEgOlxuICAgICAgICBsZW4gPD0gMHgxZmZmZmYgPyAyIDpcbiAgICAgICAgbGVuIDw9IDB4ZmZmZmZmZiA/IDMgOiBNYXRoLmZsb29yKE1hdGgubG9nKGxlbikgLyAoTWF0aC5MTjIgKiA3KSk7XG5cbiAgICAvLyBpZiAxIGJ5dGUgaXNuJ3QgZW5vdWdoIGZvciBlbmNvZGluZyBtZXNzYWdlIGxlbmd0aCwgc2hpZnQgdGhlIGRhdGEgdG8gdGhlIHJpZ2h0XG4gICAgcGJmLnJlYWxsb2MoZXh0cmFMZW4pO1xuICAgIGZvciAodmFyIGkgPSBwYmYucG9zIC0gMTsgaSA+PSBzdGFydFBvczsgaS0tKSBwYmYuYnVmW2kgKyBleHRyYUxlbl0gPSBwYmYuYnVmW2ldO1xufVxuXG5mdW5jdGlvbiB3cml0ZVBhY2tlZFZhcmludChhcnIsIHBiZikgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVWYXJpbnQoYXJyW2ldKTsgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNWYXJpbnQoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTVmFyaW50KGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZsb2F0KGFyciwgcGJmKSAgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGbG9hdChhcnJbaV0pOyAgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZERvdWJsZShhcnIsIHBiZikgICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVEb3VibGUoYXJyW2ldKTsgICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEJvb2xlYW4oYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVCb29sZWFuKGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZpeGVkMzIoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGaXhlZDMyKGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNGaXhlZDMyKGFyciwgcGJmKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTRml4ZWQzMihhcnJbaV0pOyB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZEZpeGVkNjQoYXJyLCBwYmYpICB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVGaXhlZDY0KGFycltpXSk7ICB9XG5mdW5jdGlvbiB3cml0ZVBhY2tlZFNGaXhlZDY0KGFyciwgcGJmKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVTRml4ZWQ2NChhcnJbaV0pOyB9XG5cbi8vIEJ1ZmZlciBjb2RlIGJlbG93IGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIsIE1JVC1saWNlbnNlZFxuXG5mdW5jdGlvbiByZWFkVUludDMyKGJ1ZiwgcG9zKSB7XG4gICAgcmV0dXJuICgoYnVmW3Bvc10pIHxcbiAgICAgICAgKGJ1Zltwb3MgKyAxXSA8PCA4KSB8XG4gICAgICAgIChidWZbcG9zICsgMl0gPDwgMTYpKSArXG4gICAgICAgIChidWZbcG9zICsgM10gKiAweDEwMDAwMDApO1xufVxuXG5mdW5jdGlvbiB3cml0ZUludDMyKGJ1ZiwgdmFsLCBwb3MpIHtcbiAgICBidWZbcG9zXSA9IHZhbDtcbiAgICBidWZbcG9zICsgMV0gPSAodmFsID4+PiA4KTtcbiAgICBidWZbcG9zICsgMl0gPSAodmFsID4+PiAxNik7XG4gICAgYnVmW3BvcyArIDNdID0gKHZhbCA+Pj4gMjQpO1xufVxuXG5mdW5jdGlvbiByZWFkSW50MzIoYnVmLCBwb3MpIHtcbiAgICByZXR1cm4gKChidWZbcG9zXSkgfFxuICAgICAgICAoYnVmW3BvcyArIDFdIDw8IDgpIHxcbiAgICAgICAgKGJ1Zltwb3MgKyAyXSA8PCAxNikpICtcbiAgICAgICAgKGJ1Zltwb3MgKyAzXSA8PCAyNCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRVdGY4KGJ1ZiwgcG9zLCBlbmQpIHtcbiAgICB2YXIgc3RyID0gJyc7XG4gICAgdmFyIGkgPSBwb3M7XG5cbiAgICB3aGlsZSAoaSA8IGVuZCkge1xuICAgICAgICB2YXIgYjAgPSBidWZbaV07XG4gICAgICAgIHZhciBjID0gbnVsbDsgLy8gY29kZXBvaW50XG4gICAgICAgIHZhciBieXRlc1BlclNlcXVlbmNlID1cbiAgICAgICAgICAgIGIwID4gMHhFRiA/IDQgOlxuICAgICAgICAgICAgYjAgPiAweERGID8gMyA6XG4gICAgICAgICAgICBiMCA+IDB4QkYgPyAyIDogMTtcblxuICAgICAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPiBlbmQpIGJyZWFrO1xuXG4gICAgICAgIHZhciBiMSwgYjIsIGIzO1xuXG4gICAgICAgIGlmIChieXRlc1BlclNlcXVlbmNlID09PSAxKSB7XG4gICAgICAgICAgICBpZiAoYjAgPCAweDgwKSB7XG4gICAgICAgICAgICAgICAgYyA9IGIwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGJ5dGVzUGVyU2VxdWVuY2UgPT09IDIpIHtcbiAgICAgICAgICAgIGIxID0gYnVmW2kgKyAxXTtcbiAgICAgICAgICAgIGlmICgoYjEgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgICAgIGMgPSAoYjAgJiAweDFGKSA8PCAweDYgfCAoYjEgJiAweDNGKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSAweDdGKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChieXRlc1BlclNlcXVlbmNlID09PSAzKSB7XG4gICAgICAgICAgICBiMSA9IGJ1ZltpICsgMV07XG4gICAgICAgICAgICBiMiA9IGJ1ZltpICsgMl07XG4gICAgICAgICAgICBpZiAoKGIxICYgMHhDMCkgPT09IDB4ODAgJiYgKGIyICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgICAgICBjID0gKGIwICYgMHhGKSA8PCAweEMgfCAoYjEgJiAweDNGKSA8PCAweDYgfCAoYjIgJiAweDNGKTtcbiAgICAgICAgICAgICAgICBpZiAoYyA8PSAweDdGRiB8fCAoYyA+PSAweEQ4MDAgJiYgYyA8PSAweERGRkYpKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChieXRlc1BlclNlcXVlbmNlID09PSA0KSB7XG4gICAgICAgICAgICBiMSA9IGJ1ZltpICsgMV07XG4gICAgICAgICAgICBiMiA9IGJ1ZltpICsgMl07XG4gICAgICAgICAgICBiMyA9IGJ1ZltpICsgM107XG4gICAgICAgICAgICBpZiAoKGIxICYgMHhDMCkgPT09IDB4ODAgJiYgKGIyICYgMHhDMCkgPT09IDB4ODAgJiYgKGIzICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgICAgICBjID0gKGIwICYgMHhGKSA8PCAweDEyIHwgKGIxICYgMHgzRikgPDwgMHhDIHwgKGIyICYgMHgzRikgPDwgMHg2IHwgKGIzICYgMHgzRik7XG4gICAgICAgICAgICAgICAgaWYgKGMgPD0gMHhGRkZGIHx8IGMgPj0gMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGMgPSAweEZGRkQ7XG4gICAgICAgICAgICBieXRlc1BlclNlcXVlbmNlID0gMTtcblxuICAgICAgICB9IGVsc2UgaWYgKGMgPiAweEZGRkYpIHtcbiAgICAgICAgICAgIGMgLT0gMHgxMDAwMDtcbiAgICAgICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuICAgICAgICAgICAgYyA9IDB4REMwMCB8IGMgJiAweDNGRjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gcmVhZFV0ZjhUZXh0RGVjb2RlcihidWYsIHBvcywgZW5kKSB7XG4gICAgcmV0dXJuIHV0ZjhUZXh0RGVjb2Rlci5kZWNvZGUoYnVmLnN1YmFycmF5KHBvcywgZW5kKSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlVXRmOChidWYsIHN0ciwgcG9zKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGMsIGxlYWQ7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpOyAvLyBjb2RlIHBvaW50XG5cbiAgICAgICAgaWYgKGMgPiAweEQ3RkYgJiYgYyA8IDB4RTAwMCkge1xuICAgICAgICAgICAgaWYgKGxlYWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IDB4REMwMCkge1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gMHhFRjtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkY7XG4gICAgICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEJEO1xuICAgICAgICAgICAgICAgICAgICBsZWFkID0gYztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IGxlYWQgLSAweEQ4MDAgPDwgMTAgfCBjIC0gMHhEQzAwIHwgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICAgICAgbGVhZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA+IDB4REJGRiB8fCAoaSArIDEgPT09IHN0ci5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEVGO1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gMHhCRjtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGVhZCA9IGM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGxlYWQpIHtcbiAgICAgICAgICAgIGJ1Zltwb3MrK10gPSAweEVGO1xuICAgICAgICAgICAgYnVmW3BvcysrXSA9IDB4QkY7XG4gICAgICAgICAgICBidWZbcG9zKytdID0gMHhCRDtcbiAgICAgICAgICAgIGxlYWQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweDgwKSB7XG4gICAgICAgICAgICBidWZbcG9zKytdID0gYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChjIDwgMHg4MDApIHtcbiAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gYyA+PiAweDYgfCAweEMwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA8IDB4MTAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgPj4gMHhDIHwgMHhFMDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWZbcG9zKytdID0gYyA+PiAweDEyIHwgMHhGMDtcbiAgICAgICAgICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgPj4gMHhDICYgMHgzRiB8IDB4ODA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJ1Zltwb3MrK10gPSBjID4+IDB4NiAmIDB4M0YgfCAweDgwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnVmW3BvcysrXSA9IGMgJiAweDNGIHwgMHg4MDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcG9zO1xufVxuIiwiJ3VzZSBzdHJpY3QnOyAvLyBjb2RlIGdlbmVyYXRlZCBieSBwYmYgdjMuMi4xXG5sZXQgZXhwb3J0cyA9IHt9XG5cbmV4cG9ydCBjb25zdCBtdHlwZSA9IGV4cG9ydHMubXR5cGUgPSB7XG4gICAgXCJtdF91bmtub3duXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiAwLFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfaW9tZGF0YVwiOiB7XG4gICAgICAgIFwidmFsdWVcIjogMSxcbiAgICAgICAgXCJvcHRpb25zXCI6IHt9XG4gICAgfSxcbiAgICBcIm10X21pbm1heFwiOiB7XG4gICAgICAgIFwidmFsdWVcIjogMixcbiAgICAgICAgXCJvcHRpb25zXCI6IHt9XG4gICAgfSxcbiAgICBcIm10X3N5c2luZm9cIjoge1xuICAgICAgICBcInZhbHVlXCI6IDMsXG4gICAgICAgIFwib3B0aW9uc1wiOiB7fVxuICAgIH0sXG4gICAgXCJtdF90Y2RhdGFcIjoge1xuICAgICAgICBcInZhbHVlXCI6IDQsXG4gICAgICAgIFwib3B0aW9uc1wiOiB7fVxuICAgIH0sXG4gICAgXCJtdF92Z2NkYXRhXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA1LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfdGN6b25lXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA2LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9LFxuICAgIFwibXRfbWR0bXNnXCI6IHtcbiAgICAgICAgXCJ2YWx1ZVwiOiA3LFxuICAgICAgICBcIm9wdGlvbnNcIjoge31cbiAgICB9XG59O1xuXG4vLyB1bmtub3duX21zZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB1bmtub3duX21zZyA9IGV4cG9ydHMudW5rbm93bl9tc2cgPSB7fTtcblxudW5rbm93bl9tc2cucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh1bmtub3duX21zZy5fcmVhZEZpZWxkLCB7bXQ6IDB9LCBlbmQpO1xufTtcbnVua25vd25fbXNnLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG59O1xudW5rbm93bl9tc2cud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xufTtcblxuLy8gaW9tZGF0YSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBpb21kYXRhID0gZXhwb3J0cy5pb21kYXRhID0ge307XG5cbmlvbWRhdGEucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhpb21kYXRhLl9yZWFkRmllbGQsIHttdDogMCwgdG90YWxfZF9pbnB1dHM6IDAsIHRvdGFsX2Rfb3V0cHV0czogMCwgdG90YWxfYV9pbnB1dHM6IDAsIHRvdGFsX2Ffb3V0cHV0czogMCwgZF9pbnB1dHM6IG51bGwsIGRfb3V0cHV0czogbnVsbCwgYV9pbnB1dHM6IG51bGwsIGFfb3V0cHV0czogbnVsbH0sIGVuZCk7XG59O1xuaW9tZGF0YS5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnRvdGFsX2RfaW5wdXRzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDMpIG9iai50b3RhbF9kX291dHB1dHMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLnRvdGFsX2FfaW5wdXRzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDUpIG9iai50b3RhbF9hX291dHB1dHMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNikgb2JqLmRfaW5wdXRzID0gcGJmLnJlYWRCeXRlcygpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNykgb2JqLmRfb3V0cHV0cyA9IHBiZi5yZWFkQnl0ZXMoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDgpIG9iai5hX2lucHV0cyA9IHBiZi5yZWFkQnl0ZXMoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDkpIG9iai5hX291dHB1dHMgPSBwYmYucmVhZEJ5dGVzKCk7XG59O1xuaW9tZGF0YS53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai50b3RhbF9kX2lucHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnRvdGFsX2RfaW5wdXRzKTtcbiAgICBpZiAob2JqLnRvdGFsX2Rfb3V0cHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoMywgb2JqLnRvdGFsX2Rfb3V0cHV0cyk7XG4gICAgaWYgKG9iai50b3RhbF9hX2lucHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoNCwgb2JqLnRvdGFsX2FfaW5wdXRzKTtcbiAgICBpZiAob2JqLnRvdGFsX2Ffb3V0cHV0cykgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLnRvdGFsX2Ffb3V0cHV0cyk7XG4gICAgaWYgKG9iai5kX2lucHV0cykgcGJmLndyaXRlQnl0ZXNGaWVsZCg2LCBvYmouZF9pbnB1dHMpO1xuICAgIGlmIChvYmouZF9vdXRwdXRzKSBwYmYud3JpdGVCeXRlc0ZpZWxkKDcsIG9iai5kX291dHB1dHMpO1xuICAgIGlmIChvYmouYV9pbnB1dHMpIHBiZi53cml0ZUJ5dGVzRmllbGQoOCwgb2JqLmFfaW5wdXRzKTtcbiAgICBpZiAob2JqLmFfb3V0cHV0cykgcGJmLndyaXRlQnl0ZXNGaWVsZCg5LCBvYmouYV9vdXRwdXRzKTtcbn07XG5cbi8vIG1pbm1heCA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBtaW5tYXggPSBleHBvcnRzLm1pbm1heCA9IHt9O1xuXG5taW5tYXgucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhtaW5tYXguX3JlYWRGaWVsZCwge210OiAwLCBtaW5fem9uZTogMCwgbWF4X3pvbmU6IDAsIG1pbjogMCwgbWF4OiAwfSwgZW5kKTtcbn07XG5taW5tYXguX3JlYWRGaWVsZCA9IGZ1bmN0aW9uICh0YWcsIG9iaiwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PT0gMSkgb2JqLm10ID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDIpIG9iai5taW5fem9uZSA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmoubWF4X3pvbmUgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLm1pbiA9IHBiZi5yZWFkVmFyaW50KHRydWUpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNSkgb2JqLm1heCA9IHBiZi5yZWFkVmFyaW50KHRydWUpO1xufTtcbm1pbm1heC53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5taW5fem9uZSkgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLm1pbl96b25lKTtcbiAgICBpZiAob2JqLm1heF96b25lKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgzLCBvYmoubWF4X3pvbmUpO1xuICAgIGlmIChvYmoubWluKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg0LCBvYmoubWluKTtcbiAgICBpZiAob2JqLm1heCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLm1heCk7XG59O1xuXG4vLyBzeXNpbmZvID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IHN5c2luZm8gPSBleHBvcnRzLnN5c2luZm8gPSB7fTtcblxuc3lzaW5mby5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKHN5c2luZm8uX3JlYWRGaWVsZCwge210OiAwLCBzdGF0ZTogMCwgb3JkZXJfc3RhdHVzOiAwLCBvcmRlcl9pZDogMCwgdGFyZ2V0OiAwLCBpbmpfY3ljbGU6IDAsIGN5Y2xlX2lkOiAwLCBnb29kX3BhcnRzOiAwLCB0ZXh0X21lc3NhZ2U6IFwiXCIsIG1zZzogbnVsbCwgZG1zZzogbnVsbH0sIGVuZCk7XG59O1xuc3lzaW5mby5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnN0YXRlID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIG9iai5vcmRlcl9zdGF0dXMgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNSkgb2JqLm9yZGVyX2lkID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA2KSBvYmoudGFyZ2V0ID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA3KSBvYmouaW5qX2N5Y2xlID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSA4KSBvYmouY3ljbGVfaWQgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDkpIG9iai5nb29kX3BhcnRzID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmoudGV4dF9tZXNzYWdlID0gcGJmLnJlYWRTdHJpbmcoKSwgb2JqLm1zZyA9IFwidGV4dF9tZXNzYWdlXCI7XG4gICAgZWxzZSBpZiAodGFnID09PSAxMCkgb2JqLmRtc2cgPSBkYm1zZy5yZWFkKHBiZiwgcGJmLnJlYWRWYXJpbnQoKSArIHBiZi5wb3MpLCBvYmoubXNnID0gXCJkbXNnXCI7XG59O1xuc3lzaW5mby53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5zdGF0ZSkgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnN0YXRlKTtcbiAgICBpZiAob2JqLm9yZGVyX3N0YXR1cykgcGJmLndyaXRlVmFyaW50RmllbGQoNCwgb2JqLm9yZGVyX3N0YXR1cyk7XG4gICAgaWYgKG9iai5vcmRlcl9pZCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLm9yZGVyX2lkKTtcbiAgICBpZiAob2JqLnRhcmdldCkgcGJmLndyaXRlVmFyaW50RmllbGQoNiwgb2JqLnRhcmdldCk7XG4gICAgaWYgKG9iai5pbmpfY3ljbGUpIHBiZi53cml0ZVZhcmludEZpZWxkKDcsIG9iai5pbmpfY3ljbGUpO1xuICAgIGlmIChvYmouY3ljbGVfaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDgsIG9iai5jeWNsZV9pZCk7XG4gICAgaWYgKG9iai5nb29kX3BhcnRzKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg5LCBvYmouZ29vZF9wYXJ0cyk7XG4gICAgaWYgKG9iai50ZXh0X21lc3NhZ2UpIHBiZi53cml0ZVN0cmluZ0ZpZWxkKDMsIG9iai50ZXh0X21lc3NhZ2UpO1xuICAgIGlmIChvYmouZG1zZykgcGJmLndyaXRlTWVzc2FnZSgxMCwgZGJtc2cud3JpdGUsIG9iai5kbXNnKTtcbn07XG5cbi8vIGRibXNnID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IGRibXNnID0gZXhwb3J0cy5kYm1zZyA9IHt9O1xuXG5kYm1zZy5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKGRibXNnLl9yZWFkRmllbGQsIHtkYmlkOiAwLCBwYXJhbWV0ZXJzOiBcIlwifSwgZW5kKTtcbn07XG5kYm1zZy5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxMDApIG9iai5kYmlkID0gcGJmLnJlYWRWYXJpbnQodHJ1ZSk7XG4gICAgZWxzZSBpZiAodGFnID09PSAxMDEpIG9iai5wYXJhbWV0ZXJzID0gcGJmLnJlYWRTdHJpbmcoKTtcbn07XG5kYm1zZy53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmouZGJpZCkgcGJmLndyaXRlVmFyaW50RmllbGQoMTAwLCBvYmouZGJpZCk7XG4gICAgaWYgKG9iai5wYXJhbWV0ZXJzKSBwYmYud3JpdGVTdHJpbmdGaWVsZCgxMDEsIG9iai5wYXJhbWV0ZXJzKTtcbn07XG5cbi8vIG1kdG1zZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBtZHRtc2cgPSBleHBvcnRzLm1kdG1zZyA9IHt9O1xuXG5tZHRtc2cucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyhtZHRtc2cuX3JlYWRGaWVsZCwge210OiAwLCBwcm9ncmVzczogMCwgZGJpZDogMCwgcGFyYW1ldGVyczogXCJcIn0sIGVuZCk7XG59O1xubWR0bXNnLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmoucHJvZ3Jlc3MgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDEwMCkgb2JqLmRiaWQgPSBwYmYucmVhZFZhcmludCh0cnVlKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDEwMSkgb2JqLnBhcmFtZXRlcnMgPSBwYmYucmVhZFN0cmluZygpO1xufTtcbm1kdG1zZy53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoubXQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEsIG9iai5tdCk7XG4gICAgaWYgKG9iai5wcm9ncmVzcykgcGJmLndyaXRlVmFyaW50RmllbGQoMiwgb2JqLnByb2dyZXNzKTtcbiAgICBpZiAob2JqLmRiaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDEwMCwgb2JqLmRiaWQpO1xuICAgIGlmIChvYmoucGFyYW1ldGVycykgcGJmLndyaXRlU3RyaW5nRmllbGQoMTAxLCBvYmoucGFyYW1ldGVycyk7XG59O1xuXG4vLyB0Y2RhdGEgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgdGNkYXRhID0gZXhwb3J0cy50Y2RhdGEgPSB7fTtcblxudGNkYXRhLnJlYWQgPSBmdW5jdGlvbiAocGJmLCBlbmQpIHtcbiAgICByZXR1cm4gcGJmLnJlYWRGaWVsZHModGNkYXRhLl9yZWFkRmllbGQsIHttdDogMCwgc2xpY2VfaWQ6IDAsIHpvbmVzOiAwLCByZWNvcmRzOiBbXX0sIGVuZCk7XG59O1xudGNkYXRhLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmouc2xpY2VfaWQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMykgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIHBiZi5yZWFkUGFja2VkVmFyaW50KG9iai5yZWNvcmRzLCB0cnVlKTtcbn07XG50Y2RhdGEud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xuICAgIGlmIChvYmouc2xpY2VfaWQpIHBiZi53cml0ZVZhcmludEZpZWxkKDIsIG9iai5zbGljZV9pZCk7XG4gICAgaWYgKG9iai56b25lcykgcGJmLndyaXRlVmFyaW50RmllbGQoMywgb2JqLnpvbmVzKTtcbiAgICBpZiAob2JqLnJlY29yZHMpIHBiZi53cml0ZVBhY2tlZFZhcmludCg0LCBvYmoucmVjb3Jkcyk7XG59O1xuXG4vLyB2Z2NkYXRhID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IHZnY2RhdGEgPSBleHBvcnRzLnZnY2RhdGEgPSB7fTtcblxudmdjZGF0YS5yZWFkID0gZnVuY3Rpb24gKHBiZiwgZW5kKSB7XG4gICAgcmV0dXJuIHBiZi5yZWFkRmllbGRzKHZnY2RhdGEuX3JlYWRGaWVsZCwge210OiAwLCBzbGljZV9pZDogMCwgem9uZXM6IDAsIHJlY29yZHM6IFtdfSwgZW5kKTtcbn07XG52Z2NkYXRhLl9yZWFkRmllbGQgPSBmdW5jdGlvbiAodGFnLCBvYmosIHBiZikge1xuICAgIGlmICh0YWcgPT09IDEpIG9iai5tdCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAyKSBvYmouc2xpY2VfaWQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMykgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDQpIHBiZi5yZWFkUGFja2VkVmFyaW50KG9iai5yZWNvcmRzLCB0cnVlKTtcbn07XG52Z2NkYXRhLndyaXRlID0gZnVuY3Rpb24gKG9iaiwgcGJmKSB7XG4gICAgaWYgKG9iai5tdCkgcGJmLndyaXRlVmFyaW50RmllbGQoMSwgb2JqLm10KTtcbiAgICBpZiAob2JqLnNsaWNlX2lkKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgyLCBvYmouc2xpY2VfaWQpO1xuICAgIGlmIChvYmouem9uZXMpIHBiZi53cml0ZVZhcmludEZpZWxkKDMsIG9iai56b25lcyk7XG4gICAgaWYgKG9iai5yZWNvcmRzKSBwYmYud3JpdGVQYWNrZWRWYXJpbnQoNCwgb2JqLnJlY29yZHMpO1xufTtcblxuLy8gdGN6b25lX3JlY29yZCA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB0Y3pvbmVfcmVjb3JkID0gZXhwb3J0cy50Y3pvbmVfcmVjb3JkID0ge307XG5cbnRjem9uZV9yZWNvcmQucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh0Y3pvbmVfcmVjb3JkLl9yZWFkRmllbGQsIHt0ZW1wX3NwOiAwLCBtYW51YWxfc3A6IDAsIGFjdHVhbF90ZW1wOiAwLCBhY3R1YWxfcGVyY2VudDogMCwgYWN0dWFsX2N1cnJlbnQ6IDAsIHNldHRpbmdzOiAwLCB0ZW1wZXJhdHVyZV9hbGFybTogMCwgcG93ZXJfYWxhcm06IDB9LCBlbmQpO1xufTtcbnRjem9uZV9yZWNvcmQuX3JlYWRGaWVsZCA9IGZ1bmN0aW9uICh0YWcsIG9iaiwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PT0gMSkgb2JqLnRlbXBfc3AgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLm1hbnVhbF9zcCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBvYmouYWN0dWFsX3RlbXAgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgb2JqLmFjdHVhbF9wZXJjZW50ID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDUpIG9iai5hY3R1YWxfY3VycmVudCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09PSA2KSBvYmouc2V0dGluZ3MgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNykgb2JqLnRlbXBlcmF0dXJlX2FsYXJtID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDgpIG9iai5wb3dlcl9hbGFybSA9IHBiZi5yZWFkVmFyaW50KCk7XG59O1xudGN6b25lX3JlY29yZC53cml0ZSA9IGZ1bmN0aW9uIChvYmosIHBiZikge1xuICAgIGlmIChvYmoudGVtcF9zcCkgcGJmLndyaXRlVmFyaW50RmllbGQoMSwgb2JqLnRlbXBfc3ApO1xuICAgIGlmIChvYmoubWFudWFsX3NwKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgyLCBvYmoubWFudWFsX3NwKTtcbiAgICBpZiAob2JqLmFjdHVhbF90ZW1wKSBwYmYud3JpdGVWYXJpbnRGaWVsZCgzLCBvYmouYWN0dWFsX3RlbXApO1xuICAgIGlmIChvYmouYWN0dWFsX3BlcmNlbnQpIHBiZi53cml0ZVZhcmludEZpZWxkKDQsIG9iai5hY3R1YWxfcGVyY2VudCk7XG4gICAgaWYgKG9iai5hY3R1YWxfY3VycmVudCkgcGJmLndyaXRlVmFyaW50RmllbGQoNSwgb2JqLmFjdHVhbF9jdXJyZW50KTtcbiAgICBpZiAob2JqLnNldHRpbmdzKSBwYmYud3JpdGVWYXJpbnRGaWVsZCg2LCBvYmouc2V0dGluZ3MpO1xuICAgIGlmIChvYmoudGVtcGVyYXR1cmVfYWxhcm0pIHBiZi53cml0ZVZhcmludEZpZWxkKDcsIG9iai50ZW1wZXJhdHVyZV9hbGFybSk7XG4gICAgaWYgKG9iai5wb3dlcl9hbGFybSkgcGJmLndyaXRlVmFyaW50RmllbGQoOCwgb2JqLnBvd2VyX2FsYXJtKTtcbn07XG5cbi8vIHRjem9uZSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCB0Y3pvbmUgPSBleHBvcnRzLnRjem9uZSA9IHt9O1xuXG50Y3pvbmUucmVhZCA9IGZ1bmN0aW9uIChwYmYsIGVuZCkge1xuICAgIHJldHVybiBwYmYucmVhZEZpZWxkcyh0Y3pvbmUuX3JlYWRGaWVsZCwge210OiAwLCB6b25lczogMCwgcmVjb3JkczogW119LCBlbmQpO1xufTtcbnRjem9uZS5fcmVhZEZpZWxkID0gZnVuY3Rpb24gKHRhZywgb2JqLCBwYmYpIHtcbiAgICBpZiAodGFnID09PSAxKSBvYmoubXQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgb2JqLnpvbmVzID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT09IDMpIG9iai5yZWNvcmRzLnB1c2godGN6b25lX3JlY29yZC5yZWFkKHBiZiwgcGJmLnJlYWRWYXJpbnQoKSArIHBiZi5wb3MpKTtcbn07XG50Y3pvbmUud3JpdGUgPSBmdW5jdGlvbiAob2JqLCBwYmYpIHtcbiAgICBpZiAob2JqLm10KSBwYmYud3JpdGVWYXJpbnRGaWVsZCgxLCBvYmoubXQpO1xuICAgIGlmIChvYmouem9uZXMpIHBiZi53cml0ZVZhcmludEZpZWxkKDIsIG9iai56b25lcyk7XG4gICAgaWYgKG9iai5yZWNvcmRzKSBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5yZWNvcmRzLmxlbmd0aDsgaSsrKSBwYmYud3JpdGVNZXNzYWdlKDMsIHRjem9uZV9yZWNvcmQud3JpdGUsIG9iai5yZWNvcmRzW2ldKTtcbn07XG4iLCJleHBvcnQgY29uc3QgbWF4Q2h1bmtTaXplID0gMjAwXG5cbmxldCBwYXJhbXMgPSB7XG4gIHJhdGU6IDI1XG59XG5cbmxldCBidWZmZXIgPSBbXVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuYnVmZmVyLndyaXRlID0gZnVuY3Rpb24gKHsgdHMsIGRhdGEgfSkge1xuXG4gIC8vIHNpbXVsYXRlIDQ1MCB6b25lc1xuICAvLyBkYXRhID0gZGF0YS5jb25jYXQoZGF0YSkuY29uY2F0KGRhdGEpXG5cbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzKVxuICBjb25zdCBmcmFtZSA9IHsgZGF0YSwgZGF0ZSwgdGltZTogdHMgfVxuXG4gIC8vIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICB0d2VlbihmcmFtZSwgMTIpXG5cbiAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKC03NTAwKVxufVxuXG5cbmxldCBpbnRlcnZhbHMgPSB7fVxubGV0IGxhdGVzdCA9IHt9XG5sZXQgZWFybGllc3QgPSB7fVxubGV0IHN0YXJ0ID0ge31cblxuZXhwb3J0IGNvbnN0IGJ1ZmZlckNvbW1hbmRzID0gKHBvcnQsIGUsIGlkKSA9PiB7XG4gIGNvbnN0IHsgZGF0YSB9ID0gZVxuICBcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIGxhdGVzdFtpZF0gPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdICYmIGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV0udGltZVxuICAgICAgICBlYXJsaWVzdFtpZF0gPSBsYXRlc3RbaWRdICsgMVxuICAgICAgfVxuICAgICAgXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRpbWUgPiBsYXRlc3RbaWRdKVxuICAgICAgICBjb25zdCBiYWNrRmlsbCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRpbWUgPCBlYXJsaWVzdFtpZF0pLnNsaWNlKC0obWF4Q2h1bmtTaXplIC0gbmV3ZXN0Lmxlbmd0aCkpXG4gICAgICAgIGNvbnN0IHVwZGF0ZSA9IGJhY2tGaWxsLmNvbmNhdChuZXdlc3QpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJhY2tGaWxsLmxlbmd0aCwgbmV3ZXN0Lmxlbmd0aClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB1cGRhdGUgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY29uc29sZS5sb2coc2l6ZU9mKFsgLi4uYnVmZmVyIF0pKVxuICAgIH1cblxuICAgIGludGVydmFsc1tpZF0gPSBzZXRJbnRlcnZhbChzZW5kQ2h1bmssIDUwMClcbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIHBhcmFtcyA9IGRhdGEucGFyYW1zXG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdjbG9zZScpIHtcbiAgICBjbGVhckludGVydmFsKGludGVydmFsc1tpZF0pXG4gICAgbGF0ZXN0W2lkXSA9IDBcbiAgfVxufVxuXG5cblxuXG5cblxuLy8gdXRpbGl0aWVzIGZvciB0ZXN0aW5nXG5cbmNvbnN0IHR3ZWVuID0gKG5leHQsIGZyYW1lcykgPT4ge1xuXG4gIGxldCBmcmFtZUxpc3QgPSBbXVxuICBmb3IgKGxldCBpID0gMTsgaSA8IGZyYW1lczsgaSsrKSB7XG4gICAgZnJhbWVMaXN0LnB1c2goaSlcbiAgfVxuXG4gIGNvbnN0IHsgdGltZSwgZGF0YSB9ID0gbmV4dFxuICBjb25zdCBsYXN0QnVmZmVyID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuXG4gIC8vIHRlc3QgdHdlZW5pbmdcbiAgaWYgKGxhc3RCdWZmZXIpIHtcbiAgICBmb3IgKGxldCB4IG9mIGZyYW1lTGlzdCkge1xuICAgICAgbGV0IHR3ZWVuID0gW11cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEJ1ZmZlci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSBsYXN0QnVmZmVyLmRhdGFbaV1cbiAgICAgICAgY29uc3QgY3VycmVudCA9IGRhdGFbaV1cbiAgICAgICAgaWYgKGxhc3QgJiYgY3VycmVudCkge1xuICAgICAgICAgIGxldCB0d2VlbmVkID0geyAuLi5jdXJyZW50IH1cbiAgICAgICAgICBmb3IgKGxldCBwcm9wIG9mIFsgJ2FjdHVhbF90ZW1wJywgJ2FjdHVhbF9jdXJyZW50JywgJ2FjdHVhbF9wZXJjZW50JyBdKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwcm9wKVxuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSAoY3VycmVudFtwcm9wXSAtIGxhc3RbcHJvcF0pIC8gZnJhbWVzXG4gICAgICAgICAgICB0d2VlbmVkW3Byb3BdID0gbGFzdFtwcm9wXSArIGRlbHRhICogeFxuICAgICAgICAgIH1cbiAgICAgICAgICB0d2Vlbi5wdXNoKHR3ZWVuZWQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG9mZnNldCA9IDUwMCAvIGZyYW1lcyAqIHhcbiAgICAgIGNvbnN0IHVwZGF0ZWRUUyA9IHRpbWUgLSA1MDAgKyBvZmZzZXRcbiAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh1cGRhdGVkVFMpXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IGJ1ZmZlci5wdXNoKHsgdGltZTogdXBkYXRlZFRTLCBkYXRlLCBkYXRhOiB0d2VlbiB9KSwgb2Zmc2V0KVxuICAgIH1cbiAgfVxuICBzZXRUaW1lb3V0KCgpID0+IGJ1ZmZlci5wdXNoKG5leHQpLCA1MDApXG59XG5cblxuXG5jb25zdCB0eXBlU2l6ZXMgPSB7XG4gIFwidW5kZWZpbmVkXCI6ICgpID0+IDAsXG4gIFwiYm9vbGVhblwiOiAoKSA9PiA0LFxuICBcIm51bWJlclwiOiAoKSA9PiA4LFxuICBcInN0cmluZ1wiOiBpdGVtID0+IDIgKiBpdGVtLmxlbmd0aCxcbiAgXCJvYmplY3RcIjogaXRlbSA9PiAhaXRlbSA/IDAgOiBPYmplY3RcbiAgICAua2V5cyhpdGVtKVxuICAgIC5yZWR1Y2UoKHRvdGFsLCBrZXkpID0+IHNpemVPZihrZXkpICsgc2l6ZU9mKGl0ZW1ba2V5XSkgKyB0b3RhbCwgMClcbn1cblxuY29uc3Qgc2l6ZU9mID0gdmFsdWUgPT4gdHlwZVNpemVzW3R5cGVvZiB2YWx1ZV0odmFsdWUpIiwiaW1wb3J0IFBiZiBmcm9tICdwYmYnXG5pbXBvcnQgeyB0Y2RhdGEsIG1pbm1heCwgdW5rbm93bl9tc2csIHRjem9uZSwgc3lzaW5mbywgbWR0bXNnIH0gZnJvbSAnLi9kZWNvZGUucHJvdG8nXG5pbXBvcnQgZGF0YUJ1ZmZlciwgeyBidWZmZXJDb21tYW5kcyB9IGZyb20gJy4vYnVmZmVyJ1xuXG5jb25zdCBtZXNzYWdlVHlwZXMgPSB7IHRjZGF0YSwgbWlubWF4LCB1bmtub3duX21zZywgdGN6b25lLCBzeXNpbmZvLCBtZHRtc2cgfVxuXG5sZXQgc29ja2V0XG5sZXQgcG9ydHMgPSBbXVxuXG5sZXQgY29ubmVjdGVkQ2hhbm5lbHMgPSBbXVxubGV0IGFjdGl2ZUNoYW5uZWxzID0gW11cblxuY29uc3QgdXBkYXRlQWN0aXZlID0gYXN5bmMgKCkgPT4ge1xuICBhY3RpdmVDaGFubmVscyA9IFtdXG4gIGZvcihsZXQgcCBvZiBwb3J0cykge1xuICAgIGNvbnNvbGUubG9nKHAuc3Vic2NyaXB0aW9ucylcbiAgICBhY3RpdmVDaGFubmVscyA9IGFjdGl2ZUNoYW5uZWxzLmNvbmNhdChwLnN1YnNjcmlwdGlvbnMpXG4gIH1cbiAgYWN0aXZlQ2hhbm5lbHMgPSBbIC4uLiBuZXcgU2V0KGFjdGl2ZUNoYW5uZWxzKSBdXG4gIGZvcihsZXQgYyBvZiBjb25uZWN0ZWRDaGFubmVscykge1xuICAgIGlmKCFhY3RpdmVDaGFubmVscy5pbmNsdWRlcyhjKSkge1xuICAgICAgYXdhaXQgc2VuZChgLSR7Y31gKVxuICAgIH1cbiAgfVxuICBjb25zb2xlLmxvZyhwb3J0cylcbiAgYXdhaXQgY29ubmVjdCgpXG59XG5cbmNvbnN0IGdldFBvcnREYXRhID0gcG9ydCA9PiB7XG4gIGNvbnN0IHAgPSBwb3J0cy5maW5kKHggPT4geC5wb3J0ID09IHBvcnQpXG4gIHJldHVybiBwID8gcC5kYXRhIDoge31cbn1cblxuY29uc3Qgc2V0UG9ydERhdGEgPSAocG9ydCwgZGF0YSkgPT4ge1xuICBjb25zdCBwID0gcG9ydHMuZmluZCh4ID0+IHgucG9ydCA9PSBwb3J0KVxuICBpZighcCkge1xuICAgIHBvcnRzLnB1c2goeyAuLi5kYXRhLCBwb3J0IH0pXG4gIH0gZWxzZSB7XG4gICAgcG9ydHMgPSBwb3J0cy5tYXAoeCA9PiB7XG4gICAgICBpZih4LnBvcnQgPT0gcG9ydCkge1xuICAgICAgICByZXR1cm4geyAuLi54LCAuLi5kYXRhLCBwb3J0IH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB4XG4gICAgfSlcbiAgfVxufVxuXG5jb25zdCBhZGRQb3J0U3Vic2NyaXB0aW9ucyA9IChwb3J0LCBzdWJzY3JpcHRpb25zKSA9PiB7XG4gIGNvbnN0IGN1cnJlbnQgPSAoZ2V0UG9ydERhdGEocG9ydCkgfHwge30pLnN1YnNjcmlwdGlvbnMgfHwgW11cbiAgc2V0UG9ydERhdGEocG9ydCwge1xuICAgIHN1YnNjcmlwdGlvbnM6IFsgLi4uIG5ldyBTZXQoY3VycmVudC5jb25jYXQoc3Vic2NyaXB0aW9ucykpIF1cbiAgfSlcbiAgdXBkYXRlQWN0aXZlKClcbn1cblxuXG5sZXQgcmVhZHkgPSBmYWxzZVxubGV0IHNvY2tldFRhcmdldFxubGV0IHF1ZXVlID0gW11cblxuY29uc3QgaW5pdGlhdGUgPSBhc3luYyAoKSA9PiB7XG4gIHJlYWR5ID0gdHJ1ZVxuICBmb3IobGV0IGZuIG9mIHF1ZXVlKSB7XG4gICAgZm4oKVxuICB9XG4gIGNvbm5lY3QoKVxufVxuXG5cbmNvbnN0IGNyZWF0ZVNvY2tldCA9ICgpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgaWYocmVhZHkpIHJlc29sdmUoKVxuICBpZighc29ja2V0KSB7XG4gICAgc29ja2V0ID0gbmV3IFdlYlNvY2tldChzb2NrZXRUYXJnZXQpXG4gICAgXG4gICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCBlID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nJylcbiAgICAgIGluaXRpYXRlKClcbiAgICAgIC8vIGNvbm5lY3QoKVxuICAgIH0pXG5cbiAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGFzeW5jIGUgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coZSlcbiAgICAgIGNvbnN0IHRzID0gbmV3IERhdGUoKVxuXG4gICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCBlLmRhdGEuYXJyYXlCdWZmZXIoKVxuICAgICAgY29uc3QgcGJmID0gbmV3IFBiZihidWZmZXIpXG5cbiAgICAgIGNvbnN0IHsgbXQgfSA9IHVua25vd25fbXNnLnJlYWQocGJmKVxuICAgICAgY29uc3QgZGVjb2RlcnMgPSB7XG4gICAgICAgIDI6ICdtaW5tYXgnLFxuICAgICAgICAzOiAnc3lzaW5mbycsXG4gICAgICAgIDQ6ICd0Y2RhdGEnLFxuICAgICAgICA2OiAndGN6b25lJyxcbiAgICAgICAgNzogJ21kdG1zZydcbiAgICAgIH1cbiAgICAgIGNvbnN0IHR5cGUgPSBkZWNvZGVyc1ttdF1cblxuICAgICAgY29uc3QgZGF0YSA9IG1lc3NhZ2VUeXBlc1t0eXBlXS5yZWFkKG5ldyBQYmYoYnVmZmVyKSlcblxuICAgICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgaWYoZGF0YVtrZXldICYmIGRhdGFba2V5XS5jb25zdHJ1Y3RvciA9PT0gVWludDhBcnJheSkge1xuICAgICAgICAgIGRhdGFba2V5XSA9IGdldFN0cmluZyhkYXRhW2tleV0pXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gcG9ydHNbMF0ucG9ydC5wb3N0TWVzc2FnZShkYXRhKVxuXG4gICAgICBpZihtdCA9PSA2KSB7XG4gICAgICAgIGRhdGFCdWZmZXIud3JpdGUoeyB0cywgZGF0YTogZGF0YS5yZWNvcmRzIH0pXG4gICAgICB9XG5cbiAgICAgIGZvcihsZXQgeyBwb3J0LCBzdWJzY3JpcHRpb25zIH0gb2YgcG9ydHMpIHtcbiAgICAgICAgaWYoc3Vic2NyaXB0aW9ucy5pbmNsdWRlcyh0eXBlKSkge1xuICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB0cywgZGF0YSB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBwb3N0TWVzc2FnZShkYXRhKVxuICAgIH0pXG5cbiAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBlID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdTb2NrZXQgY29ubmVjdGlvbiBsb3N0IScpXG4gICAgICByZWFkeSA9IGZhbHNlXG4gICAgICBzb2NrZXQgPSBudWxsXG4gICAgICBjb25uZWN0ZWRDaGFubmVscyA9IFtdXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ3JldHJ5aW5nJylcbiAgICAgICAgY3JlYXRlU29ja2V0KClcbiAgICAgIH0sIDEwMDApXG4gICAgfSlcbiAgfVxuICBxdWV1ZS5wdXNoKHJlc29sdmUpXG59KVxuXG5jb25zdCBzZW5kID0gYXN5bmMgbXNnID0+IHtcbiAgYXdhaXQgY3JlYXRlU29ja2V0KClcbiAgY29uc29sZS5sb2coYHNlbmRpbmcgJHttc2d9YClcbiAgc29ja2V0LnNlbmQobXNnKVxufVxuXG5jb25zdCBjb25uZWN0ID0gYXN5bmMgKCkgPT4ge1xuICBsZXQgdG9Db25uZWN0ID0gYWN0aXZlQ2hhbm5lbHMuZmlsdGVyKHggPT4gIWNvbm5lY3RlZENoYW5uZWxzLmluY2x1ZGVzKHgpKVxuICBjb25uZWN0ZWRDaGFubmVscyA9IFsgLi4uYWN0aXZlQ2hhbm5lbHMgXVxuICBmb3IobGV0IGNoYW5uZWwgb2YgdG9Db25uZWN0KSB7XG4gICAgYXdhaXQgc2VuZChgKyR7Y2hhbm5lbH1gKVxuICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0U3RyaW5nKGFycmF5KSB7XG4gIHZhciBvdXQsIGksIGxlbiwgY1xuICB2YXIgY2hhcjIsIGNoYXIzXG5cbiAgb3V0ID0gXCJcIlxuICBsZW4gPSBhcnJheS5sZW5ndGhcbiAgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICBjID0gYXJyYXlbaSsrXVxuICAgIGlmIChpID4gMCAmJiBjID09PSAwKSBicmVha1xuICAgIHN3aXRjaCAoYyA+PiA0KSB7XG4gICAgY2FzZSAwOiBjYXNlIDE6IGNhc2UgMjogY2FzZSAzOiBjYXNlIDQ6IGNhc2UgNTogY2FzZSA2OiBjYXNlIDc6XG4gICAgICAvLyAweHh4eHh4eFxuICAgICAgb3V0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYylcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAxMjogY2FzZSAxMzpcbiAgICAgIC8vIDExMHggeHh4eCAgIDEweHggeHh4eFxuICAgICAgY2hhcjIgPSBhcnJheVtpKytdXG4gICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyAmIDB4MUYpIDw8IDYgfCBjaGFyMiAmIDB4M0YpXG4gICAgICBicmVha1xuICAgIGNhc2UgMTQ6XG4gICAgICAvLyAxMTEwIHh4eHggIDEweHggeHh4eCAgMTB4eCB4eHh4XG4gICAgICBjaGFyMiA9IGFycmF5W2krK11cbiAgICAgIGNoYXIzID0gYXJyYXlbaSsrXVxuICAgICAgb3V0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoKGMgJiAweDBGKSA8PCAxMiB8XG4gICAgICAgICAgKGNoYXIyICYgMHgzRikgPDwgNiB8XG4gICAgICAgICAgKGNoYXIzICYgMHgzRikgPDwgMClcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dFxufVxuXG5cbmNvbnN0IGlkID0gKCkgPT4ge1xuICByZXR1cm4gJ18nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpXG59XG5cbm9uY29ubmVjdCA9IGZ1bmN0aW9uKGUpIHtcblxuICBjb25zdCBjb25uZWN0aW9uSWQgPSBpZCgpXG5cbiAgY29uc3QgcG9ydCA9IGUucG9ydHNbMF1cblxuICBwb3J0Lm9ubWVzc2FnZSA9IGFzeW5jIGUgPT4ge1xuICAgIGNvbnNvbGUubG9nKGUuZGF0YSlcbiAgICBjb25zdCB7IGRhdGEgfSA9IGVcblxuICAgIGlmKGRhdGEuY29tbWFuZCA9PSAnc3RhcnQnKSB7XG4gICAgICBzb2NrZXRUYXJnZXQgPSBkYXRhLnRhcmdldFxuICAgIH1cblxuICAgIGlmKGRhdGEuY29tbWFuZCA9PSAnY29ubmVjdCcpIHtcbiAgICAgIGFkZFBvcnRTdWJzY3JpcHRpb25zKHBvcnQsIGRhdGEuY2hhbm5lbHMpXG4gICAgfVxuXG4gICAgaWYoZGF0YS5jb21tYW5kID09ICdjbG9zZScpIHtcbiAgICAgIHBvcnRzID0gcG9ydHMuZmlsdGVyKHggPT4geC5wb3J0ICE9IHBvcnQpXG4gICAgfVxuXG4gICAgYnVmZmVyQ29tbWFuZHMocG9ydCwgZSwgY29ubmVjdGlvbklkKVxuICB9XG59Il0sIm5hbWVzIjpbInBiZiIsIlBiZiJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7RUFDQSxRQUFZLEdBQUcsVUFBVSxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0VBQzdELEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBQztFQUNWLEVBQUUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxFQUFDO0VBQ3BDLEVBQUUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUM7RUFDNUIsRUFBRSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksRUFBQztFQUN2QixFQUFFLElBQUksS0FBSyxHQUFHLENBQUMsRUFBQztFQUNoQixFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUM7RUFDakMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBQztFQUN2QixFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0FBQzVCO0VBQ0EsRUFBRSxDQUFDLElBQUksRUFBQztBQUNSO0VBQ0EsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFDO0VBQy9CLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQ2hCLEVBQUUsS0FBSyxJQUFJLEtBQUk7RUFDZixFQUFFLE9BQU8sS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFLEVBQUU7QUFDOUU7RUFDQSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUM7RUFDL0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDaEIsRUFBRSxLQUFLLElBQUksS0FBSTtFQUNmLEVBQUUsT0FBTyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLEVBQUUsRUFBRTtBQUM5RTtFQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO0VBQ2YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQUs7RUFDakIsR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtFQUN6QixJQUFJLE9BQU8sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDO0VBQzlDLEdBQUcsTUFBTTtFQUNULElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUM7RUFDN0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQUs7RUFDakIsR0FBRztFQUNILEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7RUFDakQsRUFBQztBQUNEO0VBQ0EsU0FBYSxHQUFHLFVBQVUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7RUFDckUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBQztFQUNiLEVBQUUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxFQUFDO0VBQ3BDLEVBQUUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUM7RUFDNUIsRUFBRSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksRUFBQztFQUN2QixFQUFFLElBQUksRUFBRSxJQUFJLElBQUksS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNsRSxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksR0FB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QUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsT0FBTztFQUN4RyxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQztFQUNwRCxLQUFLO0FBQ0w7RUFDQSxJQUFJLFlBQVksRUFBRSxTQUFTLEdBQUcsRUFBRTtFQUNoQyxRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUMzRCxLQUFLO0FBQ0w7RUFDQSxJQUFJLFlBQVksRUFBRSxTQUFTLEdBQUcsRUFBRTtFQUNoQyxRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDdkMsS0FBSztBQUNMO0VBQ0EsSUFBSSxXQUFXLEVBQUUsU0FBUyxHQUFHLEVBQUU7RUFDL0IsUUFBUSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzFCLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3JDO0VBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDbkI7RUFDQSxRQUFRLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7RUFDaEM7RUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUN0RCxRQUFRLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO0FBQ3RDO0VBQ0EsUUFBUSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsc0JBQXNCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztB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R0FBRyxHQUFHLENBQUMsbUJBQW1CLEVBQUU7RUFDbEUsUUFBUSxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7RUFDbkUsS0FBSztBQUNMO0VBQ0EsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BCO0VBQ0EsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQ3RDLElBQUksa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQ2xDLENBQUM7QUFDRDtFQUNBLFNBQVMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUU7RUFDM0MsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztFQUN2RCxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0VBQ3ZELElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7RUFDdkQsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztFQUN2RCxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLENBQUM7RUFDcEMsQ0FBQztBQUNEO0VBQ0EsU0FBUyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO0VBQ3ZDLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQztBQUNqQztFQUNBLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTztFQUN0RixJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPO0VBQ3RGLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU87RUFDdEYsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTztFQUN0RixJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPO0VBQ3RGLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO0VBQ3RDLENBQUM7QUFDRDtFQUNBLFNBQVMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDcEQsSUFBSSxJQUFJLFFBQVE7RUFDaEIsUUFBUSxHQUFHLElBQUksTUFBTSxHQUFHLENBQUM7RUFDekIsUUFBUSxHQUFHLElBQUksUUFBUSxHQUFHLENBQUM7RUFDM0IsUUFBUSxHQUFHLElBQUksU0FBUyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFFO0VBQ0E7RUFDQSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDMUIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNyRixDQUFDO0FBQ0Q7RUFDQSxTQUFTLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7RUFDMUcsU0FBUyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzFHLFNBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztFQUMxRyxTQUFTLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7RUFDMUcsU0FBUyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0VBQzFHLFNBQVMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztFQUMxRyxTQUFTLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMs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VUFBVSxFQUFFLENBQUM7RUFDL0QsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDOUQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDL0QsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7RUFDdkQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7RUFDeEQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7RUFDdkQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7RUFDeEQsQ0FBQyxDQUFDO0VBQ0YsT0FBTyxDQUFDLEtBQUssR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDcEMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDaEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7RUFDeEUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7RUFDMUUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7RUFDeEUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7RUFDMUUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzNELElBQUksSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztFQUM3RCxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDM0QsSUFBSSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzdELENBQUMsQ0FBQztBQUNGO0VBQ0E7QUFDQTtFQUNPLE1BQU0sTUFBTSxHQUFvQixFQUFFLENBQUM7QUFDMUM7RUFDQSxNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNsQyxJQUFJLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDckcsQ0FBQyxDQUFDO0VBQ0YsTUFBTSxDQUFDLFVBQVUsR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQzdDLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzdDLFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQ3hELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQ3hELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUN2RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDdkQsQ0FBQyxDQUFDO0VBQ0YsTUFBTSxDQUFDLEtBQUssR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDbkMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDaEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDNUQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDNUQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDbEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDbEQsQ0FBQyxDQUFDO0FBQ0Y7RUFDQTtBQUNBO0VBQ08sTUFBTSxPQUFPLEdBQXFCLEVBQUUsQ0FBQztBQUM1QztFQUNBLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ25DLElBQUksT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztFQUNsTSxDQUFDLENBQUM7RUFDRixPQUFPLENBQUMsVUFBVSxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDOUMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDN0MsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDckQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDNUQsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzVELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUMxRCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDN0QsU0FBUyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzVELFNBQVMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM5RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLGNBQWMsQ0FBQztFQUN0RixTQUFTLElBQUksR0FBRyxLQUFLLEVBQUUsRUFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUM7RUFDbEcsQ0FBQyxDQUFDO0VBQ0YsT0FBTyxDQUFDLEtBQUssR0FBRyxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDcEMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDaEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLGdCQUFn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RUFBRTtFQUM3QyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUM3QyxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDNUQsU0FBUyxJQUFJLEdBQUcsS0FBSyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzFELFNBQVMsSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzVELENBQUMsQ0FBQztFQUNGLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ25DLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2hELElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzVELElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3RELElBQUksSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0VBQ2xFLENBQUMsQ0FBQztBQUNGO0VBQ0E7QUFDQTtFQUNPLE1BQU0sTUFBTSxHQUFvQixFQUFFLENBQUM7QUFDMUM7RUFDQSxNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNsQyxJQUFJLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0VBQy9GLENBQUMsQ0FBQztFQUNGLE1BQU0sQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUM3QyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUM3QyxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUN4RCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztFQUNyRCxTQUFTLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztFQUNoRSxDQUFDLENBQUM7RUFDRixNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNuQyxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUNoRCxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUM1RCxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEdB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
