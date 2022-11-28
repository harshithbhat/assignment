const app = require('./app')

const supertest = require("supertest");

const MongoClient = require('mongodb').MongoClient;
const url = require('./secret')


let connection;
  let db;

  beforeAll(async () => {
    connection = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db('assignments');
  });



it('addUser',async()=>{

  const myDB = db.collection('user');

  await myDB.insertOne({
    name:'harshitha bhat'
  })
    
  const response = supertest(app)
  .post('/addUser')
  .send({
    name:'1'
  })
  .expect(200)
})


test('getUser',async()=>{

  const myDB = db.collection('user');

  await myDB.find({
    name1:'Harshitha'
  })

  const response = supertest(app)
  .get('/users/:name')
  .send({
    name:'Harshitha'
  })
  .expect(200)
})

test('dailySpends',async()=>{

  const myDB = db.collection('dailySpends');

  await myDB.insertOne({
   
    userId:"637dc7d78a464c05b699a398",
    item:"book",
    date:"2020-02-12",
    amount:15
  })
  
  supertest(app)
  .post('dailySpends')
  .send({
    userId:'1'
  })
  .expect(200)
})

test('/dailySpends/:userId',async() => {

  const myDB = db.collection('dailySpends');

  await myDB.find({
    $and:[
    {"userId" : 1},
    {
        $or:[
    {"date" : {$gte:'2022-02-12',$lt:'2022-12-12'}},
    {
        "amount":{$gte:10,$lte:11}
    }

    ]
}
]
})

  supertest(app).get('dailySpends/:userId')
  .send({
    userId:'1',
    startDate:'2022-02-02',
    endDate:'2022-03-10',
    startAmount:10,
    endAmount:12
  })
  .expect(200)
})