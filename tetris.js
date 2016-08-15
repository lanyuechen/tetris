class App {
	constructor(canvas, conf = {}) {
		this.row = conf.row || 16	//行数
		this.col = conf.col || 9	//列数
		this.unit = conf.unit || 10	//单位长度 1 grid == 10 unit

		this.score = 0 	//得分

		this.grid = [] 	// row * col
		for (let i = 0; i < this.row; i++) {
			let tmp = []
			for (let j = 0; j < this.col; j++) {
				tmp.push({value: 0, color: '#000'})
			}
			this.grid.push(tmp)
		}

		this.canvas = canvas 	//画布
		this.canvas.width = this.col * this.unit + 1 + this.unit * 6
		this.canvas.height = this.row * this.unit + 1	//+1是因为画图时为了避免1像素模糊，向右下各移动了0.5，不+1的话右侧和下侧的线将会被覆盖
		this.context = this.canvas.getContext('2d')
		
		this.current = null //当前砖块
		this.blocks = []	//方块队列，fifo

		this.types = [		//方块类型
			[[1,1,1,1]],		//I
			[[1,1,1], [0,1,0]],	//T
			[[1,1,1], [1,0,0]],	//L
			[[1,1,1], [0,0,1]],	//L'
			[[1,1,0], [0,1,1]],	//Z
			[[0,1,1], [1,1,0]],	//Z'
			[[1,1], [1,1]] 		//O
		];
	}
	finish() {
		for (let [i, row] of this.grid.entries()) {
			let sum = 0;
			for (let v of row) {
				sum += v.value;
			}
			if (sum == this.col * 2) {	//这行已经完成
				console.log("finish", i);
				for (let j = i; j > 0 ; j--) {
					this.grid[j] = this.grid[j - 1];
				}
				let tmp = []
				for (let j = 0; j < this.col; j++) {
					tmp.push({value: 0, color: '#000'})
				}
				this.grid[0] = tmp;

				this.score += 1;	//得分++
			}
		}
	}
	gameover() {
		let gameover = false;
		for (let item of this.grid[0]) {	//检测第一行，如果有砖块，表示游戏结束，在每次finish后检测
			if (item.value == 2) {
				gameover = true;
			}
		}
		if (gameover) {	//游戏结束处理
			clearInterval(this.interval);
			clearInterval(this.runningInterval);
		}
		return gameover;
	}
	keyHandler(event) {
		switch(event.keyCode){
			case 37: 	//left
				this.move(-1, 0)
				break;
			case 38: 	//up
				this.rotate()
				break;
			case 39: 	//right
				this.move(1, 0)
				break;
			case 40: 	//bottom
				this.move(0, 1)
				break;
		}
	}
	init() {
		//初始化方块，当前1个，队列中1个，总共2个
		this.add();
		this.add();
		this.refresh();
		this.interval = setInterval(() => {
			this.refresh();
		}, 100);

		this.runningInterval = setInterval(() => {
			this.move(0, 1);
		}, 1000);
		
		window.onkeydown = this.keyHandler.bind(this);
	}
	refresh() {
		this.clear();		//清空画布
		this.draw();		//重新绘制
		this.drawInfo();	//绘制信息区域
	}
	/**
	 * 生成新的砖块
	 */
	add() {
		let idx = Math.floor(Math.random() * this.types.length)
		this.current = this.blocks.shift();
		if (this.current) {
			this.current.i = -1;
			this.current.j = Math.floor(this.col / 2);
		}
		this.blocks.push(new Block(0, 0, this.types[idx], this._randomColor()));
	}
	collision(block, h, v) {
		for (let b of block.blocks) {
			let i = block.i + b.i;
			let j = block.j + b.j;
			if (v > 0) {
				if ((i+1 >= 0 && i+1 < this.row && this.grid[i+1][j].value == 2) || i+1 >= this.row) {
					this.mapIn(this.current, 2)
					this.finish();			//如果向下完成，则进行一次检查
					if (!this.gameover()) {	//finish()后，检查是否游戏结束
						this.add();
					}
					return true;
				}
			}
			if (h < 0) {
				if ((i >= 0 && j-1>=0 && j-1 < this.col && this.grid[i][j-1].value == 2) || j <= 0) {
					return true
				}
			}
			if (h > 0) {
				if ((i >= 0 && j+1>=0 && j+1 < this.col && this.grid[i][j+1].value == 2) || j+1 >= this.col) {
					return true;
				}
			}
		}
		return false;
	}
	rotate() {
		//验证是否可以旋转
		for (let block of this.current.blocks) {
			let i = this.current.i + block.j;
			let j = this.current.j - block.i;
			if (i < 0 || i > this.row - 1 || j < 0 || j > this.col - 1) {	//出界
				return false;
			}
			if (this.grid[i][j].value == 2) {	//与其他砖块冲突
				return false;
			}
		}
		
		this.mapOut(this.current);
		for (let block of this.current.blocks) {
			let tmp = -block.i;
			block.i = block.j;
			block.j = tmp;
		}
		this.mapIn(this.current);
	}
	move(h, v) {
		if (this.collision(this.current, h, v)) {
			return;
		}
		this.mapOut(this.current);
		this.current.i += v;
		this.current.j += h;
		this.mapIn(this.current);
	}
	mapIn(block, state = 1) {
		for (let b of block.blocks) {
			let i = block.i + b.i;
			let j = block.j + b.j;
			if (i >= 0 && i < this.row && j >= 0 && j < this.col) {
				this.grid[i][j].value = state;
				this.grid[i][j].color = block.color;
			}
		}
	}
	mapOut(block) {
		for (let b of block.blocks) {
			let i = block.i + b.i;
			let j = block.j + b.j;
			if (i >= 0 && i < this.row && j >= 0 && j < this.col) {
				this.grid[i][j].value = 0;
			}
		}
	}
	drawInfo() {
		//绘制下一个砖块
		for (let block of this.blocks) {
			block.i = Math.floor(this.row / 2);
			block.j = this.col + 2;
			for (let b of block.blocks) {
				let color = block.color;
				let harfUnit = this.unit / 2;
				let x = (block.j + b.j) * this.unit + harfUnit;
				let y = (block.i + b.i) * this.unit + harfUnit;

				this.context.translate(0.5, 0.5);	//解决1px模糊问题
				this.context.fillStyle = color;
				this.context.strokeStyle = "#aaa";
				this.context.strokeRect(x - harfUnit, y - harfUnit, this.unit, this.unit)
				this.context.fillRect(x - harfUnit, y - harfUnit, this.unit, this.unit)
				this.context.translate(-0.5, -0.5);
			}
		}
		//绘制得分
		this.context.font = '14px Arial';
		this.context.fillText(this.score, this.col * this.unit + 15, this.row / 2 * this.unit + 30);
	}
	draw() {
		for (let [i, row] of this.grid.entries()) {
			for (let [j, item] of row.entries()) {
				this.drawPix(i, j, item);
			}
		}
	}
	drawPix(i, j, pix) {
		let color = pix.value ? pix.color : '#000';
		let harfUnit = this.unit / 2;
		let x = j * this.unit + harfUnit;
		let y = i * this.unit + harfUnit;
		
		this.context.translate(0.5, 0.5);	//解决1px模糊问题
		this.context.fillStyle = color;
		this.context.strokeStyle = "#aaa";
		this.context.strokeRect(x - harfUnit, y - harfUnit, this.unit, this.unit)
		this.context.fillRect(x - harfUnit, y - harfUnit, this.unit, this.unit)
		this.context.translate(-0.5, -0.5);
	}
	clear() {
		this.context.save();
		this.context.setTransform(1, 0, 0, 1, 0, 0);
		this.context.clearRect(0, 0, canvas.width, canvas.height);
		this.context.restore();
	}
	_randomColor() {
		return '#'+('00000'+(Math.random()*0xffffff<<0).toString(16)).slice(-6);
	}
}
class Block {
	constructor(i, j, type, color) {
		this.i = i;
		this.j = j;
		this.color = color;
		this.blocks = [];
		for (let [i, row] of type.entries()) {
			for (let [j, value] of row.entries()) {
				if (value == 1) {
					this.blocks.push({i: i - 1, j: j - 1, color: color});
				}
			}
		}
	}
}