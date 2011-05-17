var WHITE_PIECE = new Image();
WHITE_PIECE.src = "img/piece_lw.png";
var BLACK_PIECE = new Image();
BLACK_PIECE.src = "img/piece_lb.png";
var WHITE_PIECE_S = new Image();
WHITE_PIECE_S.src = "img/piece_sw.png";
var BLACK_PIECE_S = new Image();
BLACK_PIECE_S.src = "img/piece_sb.png";
var BACKGROUND = new Image();
BACKGROUND.src = "img/board.png";

/**
 * オセロ
 */
var Othello = function(ctx) {
  this.ctx = ctx;
}
Othello.prototype = {
  CELL_WIDTH : 67,
  BOARD_MARGIN : 33,

  start : function(player1, player2) {
    this.players = [player1, player2]
    this.pieces = [2, 2];
    this.current = 0;
    this.board = new Board();
    this.redraw();
  },

  getCurrentPlayer : function() {
    return this.players[this.current];
  },

  getCurrentPiece : function() {
    return this.current + 1;
  },

  togglePlayer : function() {
    this.current = 1 - this.current;
  },

  redraw : function() {
    this.draw(this.ctx);  
  },

  draw : function(ctx) {
    // board
    ctx.drawImage(BACKGROUND, 0, 0);

    // pieces
    cellPadding = 2;
    for(var j=0; j<this.board.getHeight(); j++) {
      for(var i=0; i<this.board.getWidth(); i++) {
        var x = this.BOARD_MARGIN+cellPadding+(i*this.CELL_WIDTH);
        var y = this.BOARD_MARGIN+cellPadding+(j*this.CELL_WIDTH);
        switch(this.board.getState(i, j)) {
          case 1: ctx.drawImage(BLACK_PIECE, x, y); break;
          case 2: ctx.drawImage(WHITE_PIECE, x, y); break;
        }
      }
    }

    // show player name
    ctx.font = "14px gothic";
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.fillText(this.players[0].getName(), 667, 68);
    ctx.fillText(this.players[1].getName(), 667, 95);

    // show pieces num
    ctx.font = "18px gothic";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(this.pieces[0], 668, 150);
    ctx.fillStyle = "black";
    ctx.fillText(this.pieces[1], 735, 150);

    // show current turn
    ctx.font = "14px gothic";
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.fillText('次は　 の番です', 650, 205);
    ctx.drawImage([BLACK_PIECE_S, WHITE_PIECE_S][this.current], 680, 193);
  },

  updatePieces : function(num) {
    this.pieces[this.current] += num+1;
    this.pieces[1-this.current] -= num;  
  },

  isOver : function() {
    return (this.pieces[0]+this.pieces[1] == 64) || (this.pieces[0]*this.pieces[1] == 0);
  },

  update : function(x, y) {
    if(this.board.getState(x, y) == 0) {
      var flips = this.board.put(x, y, this.getCurrentPiece());
      if(flips > 0) {
        this.updatePieces(flips);
        this.togglePlayer();
        this.getCurrentPlayer().notifyPut(x, y);
        this.redraw();
        if(this.isOver()) {
          // 終了処理
          winner = this.players[(this.pieces[0] > this.pieces[1]) ? 0 : 1];
          if(confirm(winner.getName()+"の勝ち\nもう一度対戦しますか？")) {
            this.start(this.players[1], this.players[0]);
          }
        }
      }
    }
  },

  pass : function() {
    this.togglePlayer();
    this.getCurrentPlayer().notifyPass();
    this.redraw();
  },

  onclick : function(e) {
    console.log([e.layerX, e.layerY]);
    if(e.layerX > 652 && e.layerX < 754 && e.layerY > 280 && e.layerY < 324) {
      this.pass();
    }
    else {
      var player = this.getCurrentPlayer();
      player.onclick(this, e);
    }
  },

  onmessage : function(m) {
    var player = this.getCurrentPlayer();
    switch(m.action) {
      case 'pass' : this.pass(); break;
      case 'put' : player.onmessage(this, m); break;
    }
  },
}

/**
 * プレイヤーの抽象クラス
 */
var Player = function(name) {
  this.name = name;
}
Player.prototype = {
  getName : function() {
    return this.name;
  },
  respondsTo : function(eventType) {
    return false;
  },
  onclick : function(othello, e) {},
  onmessage : function(othello, e) {},
  notifyPut : function(x, y) {},
  notifyPass : function() {},
}

/**
 * ローカルのプレイヤー
 * onclickイベントに反応する
 */
var LocalPlayer = function(name) {
  this.name = name;
}
LocalPlayer.prototype = new Player();
LocalPlayer.prototype.onclick = function(othello, e) {
  var x = Math.floor((e.layerX - othello.BOARD_MARGIN) / othello.CELL_WIDTH);
  var y = Math.floor((e.layerY - othello.BOARD_MARGIN) / othello.CELL_WIDTH);
  othello.update(x, y);
}

/**
 * リモートのプレイヤー
 * onmessageイベントに反応する
 */
var RemotePlayer = function(name, conn) {
  this.name = name;
  this.conn = conn;
}
RemotePlayer.prototype = new Player();
RemotePlayer.prototype.respondsTo = function(eventType) {
  return eventType == 'onmessage';
}
RemotePlayer.prototype.onmessage = function(othello, e) {
  othello.update(e.x, e.y);
}
RemotePlayer.prototype.notifyPut = function(x, y) {
  conn.send({action:'put', x:x, y:y});  
}
RemotePlayer.prototype.notifyPass = function() {
  conn.send({action:'pass'});  
}

/**
 * 板
 */
var Board = function() {
  this.state = [
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,2,1,0,0,0],
    [0,0,0,1,2,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ];
}
Board.prototype = {
  getState : function(x, y) {
    if(x>=0 && x<8 && y>=0 && y<8) {
      return this.state[y][x];
    }
    else {
      return null;
    }
  },

  setState : function(x, y, s) {
    if(x>=0 && x<8 && y>=0 && y<8) {
      this.state[y][x] = s;
    }
  },

  put : function(x, y, piece) {
    var ret = 0;

    for(var dy = -1; dy <= 1; dy++) {
      for(var dx = -1; dx <= 1; dx++) {
        if(dx == 0 && dy == 0) { continue; }
        var tx = x+dx;
        var ty = y+dy;
        var f = [];
        while(this.getState(tx, ty) == 3-piece) {
          f.push({x:tx, y:ty});
          tx += dx;
          ty += dy;
        }

        if(f.length > 0 && this.getState(tx, ty) == piece) {
          ret += f.length;
          for(var i=0; i<f.length; i++) {
            this.setState(f[i].x, f[i].y, piece);
          }
          this.setState(x, y, piece);
        }
      }
    }

    return ret;
  },

  getHeight : function() {
    return this.state.length;
  },

  getWidth : function() {
    return this.state[0].length;
  },
}

