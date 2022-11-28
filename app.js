const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient;
const router = express.Router();
const app = express()
const url = require('./secret.js');
const ObjectId = require('mongodb').ObjectId
const redis = require('redis');
require('dotenv').config()

app.use(bodyParser.json())



const client = new MongoClient(url,{
    useNewUrlParser : true,
    useUnifiedTopology: true
})





let redisClient;

( async() => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

   await redisClient.connect();
})();


async function cacheData(req, res, next) {
    console.log("===cached")
    const name = req.params.name;
    let results;
    try {
      const cacheResults = await redisClient.get(name);
      if (cacheResults) {
        results = JSON.parse(cacheResults);
        res.send({
          fromCache: true,
          data: results,
        });
      } 
      else {
        next();
      }
    } catch (error) {
      console.error(error);
      res.status(404);
    }
  }
  

client.connect(err => {

    const myDB = client.db('assignments').collection('user')
    const myDB1 = client.db('assignments').collection('dailySpends')

    app.get('/users/:name',cacheData,async(req,res)=>{


        console.log("inside route/")
//         const name = req.params.name;
//   let results;
//   let isCached = false;

//         const cacheResults = await redisClient.get(name);

//         console.log("cacheResults")
//         console.log(cacheResults)
//         if (cacheResults) {
//             console.log("==="+(cacheResults))
//           isCached = true;
//           results = JSON.parse(cacheResults);


//           res.contentType('application/json')
//           res.send(JSON.stringify(results))

//         }

        // else{
            // console.log("inside else")
            myDB.find(req.params).toArray()
            .then(async(r)=>{
                // console.log(r)
                results = r

                // console.log(results)

                res.contentType('application/json')
                res.status(200).json(JSON.stringify(r))

        
                await redisClient.set(name,JSON.stringify(results));
            })
        // }

        
    })


    app.post('/addUser',(req,res)=>{

            myDB.insertOne(req.body)
            .then(results=>{
                // console.log(results)
                res.contentType('application/json')
                // res.status(200)
                res.status(200).json(results);

                // res.send(200)
            })
    })

    app.post('/dailySpends',(req,res)=>{

        myDB.find(ObjectId(req.body.userId)).toArray()
        .then(results=>{

            // console.log(results)
            // console.log(results.length)

            if(results.length>0){
                myDB1.insertOne(req.body)
                .then(res1 =>{
                    // console.log(res1)
                res.contentType('application/json')
                res.status(200).json(res1)
            })
            }else{
                res.status(200).json("User not found")
            }
           
    }).catch(err=>{
        console.log("user not found")
    })
        })
        

    app.get('/dailySpends/:userId',async(req,res)=>{

        

            let startDate = 0
            let endDate = 0
            if(req.body.startDate && req.body.endDate){
                startDate = req.body.startDate
                endDate = req.body.endDate
            }

            let startAmount = 0 
            let endAmount = 0

            if(req.body.startAmount && req.body.endAmount){
                startAmount = req.body.startAmount
                endAmount = req.body.endAmount
            }

            // console.log(req.params.userId)
            let results = await myDB1.find({
                $and:[
                {"userId" : req.params.userId},
                {
                    $or:[
                {"date" : {$gte:startDate,$lt:endDate}},
                {
                    "amount":{$gte:startAmount,$lte:endAmount}
                }

                ]
            }
            ]
            }).toArray()
              

            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
         
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;

            const paginationResults = {};

            // console.log(results.length)
            // console.log(results)
         
            // console.log(startIndex,endIndex)
            // results = results.slice(startIndex, endIndex);

                res.status(200).json(results)
        })

    })

    const {format} = require('util');
    const Multer = require('multer');
    const {Storage} = require('@google-cloud/storage');
    
    const storage = new Storage({
      projectId:'',
      keyFilename:''
    });
    
    const multer = Multer({
      storage: Multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, 
      },
    });

    const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);
    
    
    app.post('/upload', multer.single('file'), (req, res, next) => {

      if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
      }
    
      const blob = bucket.file(req.file.originalname);
      const blobStream = blob.createWriteStream();
    
      blobStream.on('error', err => {
        next(err);
      });
    
      blobStream.on('finish', () => {
        const publicUrl = format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );
        res.status(200).json(publicUrl);
      });
    
      blobStream.end(req.file.buffer);
    });

module.exports = app.listen(8000,()=>{
    console.log('server is ready')
})

