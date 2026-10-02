import express from 'express';
import bodyParser from 'body-parser';



const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const PORT=3000;

const start_and_setup_server = ()=>{
    app.listen(PORT, ()=>{
        console.log(`Server is running on PORT ${PORT}`);
    })
}

start_and_setup_server();