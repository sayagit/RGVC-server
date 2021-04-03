const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const app = express();
// const bodyParser = require('body-parser');
// const mongoose = require('mongoose');
require('dotenv').config();


// connect to db--------------------------------
// mongoose
//     .connect(process.env.DATABASE, {
//         useNewUrlParser: true,
//         useFindAndModify: false,
//         useUnifiedTopology: true,
//         useCreateIndex: true
//     })
//     .then(() => console.log('DB connected'))
//     .catch(err => console.log('DB CONNECTION ERROR: ', err));

// app middlewares-------------------------------
//morgan:expressのログ出力するライブラリ
app.use(morgan('dev'));
//bodyParserの代わりにexpress.json()を使う
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// cors：APPをCORS対応させる
app.use(cors()); // allows all origins
// if ((process.env.NODE_ENV = 'development')) {
//     app.use(cors({ origin: `http://localhost:3000` }));
// }

const http = require("http");
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        method: ["GET", "POST"]
    }
});

//import routes-----------------------------------
// const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/user');

// middleware--------------------------------------
//localhost:8000/api以降のgetリクエストを”./routes/auth.js”とuser.jsで処理する
// app.use('/api', authRoutes);
// app.use('/api', userRoutes);


//socket.io----------------------------------------
//{ roomID: [socketID] }
const users = {};
//{ socketID: roomID }
const socketToRoom = {};
//on()メソッドを使ってフロント側と接続されているかを確認する
//"connection"を設定することで接続されているかどうかを確認
//接続されている場合は、第2引数の関数を実行する
io.on('connection', socket => {

    //フロント側で"join room"がemitされたら呼ばれる
    socket.on("join room", roomID => {
        //もし部屋が既に存在する場合
        if (users[roomID]) {
            const length = users[roomID].length;
            //4人以上は参加不可
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            //参加者を追加
            users[roomID].push(socket.id);
        } else {
            //部屋が初めて作られた場合
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        //参加者以外のユーザー
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);
        //参加者以外の情報を送信
        socket.emit("all users", usersInThisRoom);
    });


    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
    });

});

app.get("/", function (req, res) {
    res.send("<h1>Hello World!</h1>")
});

//ポート開放---------------------------------------
//.envで指示されたポートあるいは8000でサーバーを待ち受け状態にする
const port = process.env.PORT || 8000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}).on("error", e => {
    console.error(e);
});