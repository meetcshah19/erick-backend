var express = require("express")
var router = express.Router();
let socketapi = require("../connectors/socket");
var Model = require("../connectors/mongo");
var axios = require("axios");
router.post("/save_erick_data/", function (req, res) {
  var api_data = req.body;
  console.log(
    JSON.stringify({
      erick_id: api_data["end_device_ids"]["device_id"],
      lat: api_data["uplink_message"]["decoded_payload"]["data"][0],
      lng: api_data["uplink_message"]["decoded_payload"]["data"][1],
      received_at: new Date(),
    })
  );
  socketapi.io.emit("update", {
    erick_id: api_data["end_device_ids"]["device_id"],
    lat: api_data["uplink_message"]["decoded_payload"]["data"][0],
    lng: api_data["uplink_message"]["decoded_payload"]["data"][1],
    received_at: new Date(),
  });

  var save_data = new Model({
    erick_id: api_data["end_device_ids"]["device_id"],
    lat: api_data["uplink_message"]["decoded_payload"]["data"][0],
    lng: api_data["uplink_message"]["decoded_payload"]["data"][1],
    speed: api_data["uplink_message"]["decoded_payload"]["data"][4],
    received_at: new Date(),
  }).save(function (err, result) {
    if (err) throw err;

    console.log(result + err);
    if (result) {
      res.json(result);
    }
  });
});

router.post("/save_driver_details/", async function (req, res) {
  let api_data = req.body;
  let id = req.body["id"];
  let name = req.body["name"];
  const result = await Model.updateMany(
    { erick_id: "eui-0102030405060708" },
    {
      driver_name: "Jon Snow",
      driver_contact: "7894561230",
    }
  );
});

router.post("/downlink/", async function (req, res) {
  let erick_id = req.body["erick_id"]
  let api_data = req.body["data"]
  var data = JSON.stringify({
    "downlinks": [
      {
        "frm_payload": Buffer.from(api_data).toString('base64'),        
        "f_port": 15,
        "priority": "NORMAL"
      }
    ]
  });

  var config = {
    method: 'post',
    url: `https://eu1.cloud.thethings.network/api/v3/as/applications/erick-tracking/webhooks/testing/devices/`+erick_id+`/down/push`,
    headers: {
      'Authorization': 'Bearer NNSXS.ILIFQTABIZ5JAQIT4BOTLZ7KGDQJFJDI2ULAMNQ.UUZ5XK7MKIKG3V4KGQN45QOMBYRPQLIG2T3UN5NZJN32JVHDIS6A',
      'Content-Type': 'application/json',
      'User-Agent': 'my-integration/my-integration-version'
    },
    data: data
  };

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });

})

router.get("/get_erick_data/", function (req, res) {
  if (req.query.erick_id == "all") {
    if (req.query.start_date == undefined && req.query.end_date == undefined) {
      Model.find({}, function (err, result) {
        if (result) {
          res.send(result);
        }
      });
    } else if (
      req.query.start_date != undefined &&
      req.query.end_date != undefined
    ) {
      Model.find(
        {
          received_at: { $gte: req.query.start_date, $lte: req.query.end_date },
        },
        function (err, result) {
          if (err) throw err;
          if (result) {
            res.send(result);
          }
        }
      );
    } else if (
      req.query.start_date != undefined &&
      req.query.end_date == undefined
    ) {
      Model.find(
        { received_at: { $gte: req.query.start_date } },
        function (err, result) {
          if (err) throw err;
          if (result) {
            res.send(result);
          }
        }
      );
    } else if (
      req.query.start_date == undefined &&
      req.query.end_date != undefined
    ) {
      Model.find(
        { received_at: { $lte: req.query.end_date } },
        function (err, result) {
          if (err) throw err;
          if (result) {
            res.send(result);
          }
        }
      );
    }
  } else if (
    req.query.erick_id == undefined &&
    req.query.start_date == undefined &&
    req.query.end_date == undefined
  ) {
    Model.aggregate(
      [
        { $sort: { received_at: -1 } },
        {
          $group: {
            _id: "$erick_id",
            data: {
              $first: {
                erick_id: "$erick_id",
                lat: "$lat",
                lng: "$lng",
                speed: "$speed",
                driver_name: "$driver_name",
                driver_contact: "$driver_contact",
                received_at: "$received_at",
              },
            },
          },
        },
      ],
      (err, data) => {
        res.send(data);
      }
    );
  } else if (
    req.query.start_date == undefined &&
    req.query.end_date == undefined
  ) {
    Model.aggregate(
      [{ $match: { erick_id: req.query.erick_id } }],
      (err, data) => {
        res.send(data);
      }
    );
  } else if (req.query.erick_id == undefined) {
    Model.aggregate(
      [
        { $match: { received_at: { $lte: new Date(req.query.end_date) } } },
        { $sort: { received_at: -1 } },
        {
          $group: {
            _id: "$erick_id",
            data: {
              $first: {
                lat: "$lat",
                lng: "$lng",
                speed: "$speed",
                driver_name: "$driver_name",
                driver_contact: "$driver_contact",
                received_at: "$received_at",
              },
            },
          },
        },
      ],
      (err, data) => {
        res.send(data);
      }
    );
  } else if (req.query.end_date == undefined) {
    Model.aggregate(
      [
        {
          $match: {
            erick_id: req.query.erick_id,
            received_at: { $gte: new Date(req.query.start_date) },
          },
        },
      ],
      (err, data) => {
        res.send(data);
      }
    );
  } else if (req.query.start_date == undefined) {
    Model.aggregate(
      [
        {
          $match: {
            erick_id: req.query.erick_id,
            received_at: { $lte: new Date(req.query.end_date) },
          },
        },
      ],
      (err, data) => {
        res.send(data);
      }
    );
  } else {
    console.log(req.query.start_date);
    Model.aggregate(
      [
        {
          $match: {
            erick_id: req.query.erick_id,
            received_at: {
              $gte: new Date(req.query.start_date),
              $lte: new Date(req.query.end_date),
            },
          },
        },
      ],
      (err, data) => {
        console.log(data);
        console.log(err);
        res.send(data);
      }
    );
  }
});

module.exports = router;
