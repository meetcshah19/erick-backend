var express = require("express")
var router = express.Router();
let socketapi = require("../connectors/socket");
var Model = require("../connectors/mongo");
var axios = require("axios");

router.post("/save_erick_data/", function (req, res) {
  var api_data = req.body;
  if (api_data["end_device_ids"]["device_id"] && api_data["uplink_message"]["decoded_payload"]["data"][0] && api_data["uplink_message"]["decoded_payload"]["data"][1] ) {
    console.log(
      JSON.stringify({
        erick_id: api_data["end_device_ids"]["device_id"],
        lat: api_data["uplink_message"]["decoded_payload"]["data"][0],
        lng: api_data["uplink_message"]["decoded_payload"]["data"][1],
        locked: api_data["uplink_message"]["decoded_payload"]["data"][2],
        received_at: new Date(),
      })
    );
    socketapi.io.emit("update", {
      erick_id: api_data["end_device_ids"]["device_id"],
      lat: api_data["uplink_message"]["decoded_payload"]["data"][0],
      lng: api_data["uplink_message"]["decoded_payload"]["data"][1],
      locked: api_data["uplink_message"]["decoded_payload"]["data"][2],
      received_at: new Date(),
    });

    var save_data = new Model({
      erick_id: api_data["end_device_ids"]["device_id"],
      lat: api_data["uplink_message"]["decoded_payload"]["data"][0],
      lng: api_data["uplink_message"]["decoded_payload"]["data"][1],
      locked: api_data["uplink_message"]["decoded_payload"]["data"][2],
      speed: api_data["uplink_message"]["decoded_payload"]["data"][4],
      received_at: new Date(),
    }).save(function (err, result) {
      if (err) throw err;

      console.log(result + err);
      if (result) {
        res.json(result);
      }
    });
  } else {
    res.send(400);
  }
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
  let erick_id = req.body["id"]
  let api_data = req.body["state"] == "lock" ? "AA" : "BA"
  var data = JSON.stringify({
    "downlinks": [
      {
        "frm_payload": api_data,
        "f_port": 1,
        "priority": "HIGH"
      }
    ]
  });

  var config = {
    method: 'post',
    url: `https://eu1.cloud.thethings.network/api/v3/as/applications/erick-tracking/webhooks/downlink-hook/devices/` + erick_id + `/down/push`,
    headers: {
      'Authorization': 'Bearer NNSXS.KPXZZN4TBNWICWGCEBTBD2B6MD73EVOJS3GPP4I.JX5D6MAUFITYXMXDXPKAPBOC3FBC7OH62KP6IN5FG2WBQBFAF7ZA',
      'Content-Type': 'application/json',
      'User-Agent': 'my-integration/my-integration-version'
    },
    data: data
  };

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
      res.send(200);
    })
    .catch(function (error) {
      console.log(error);
      res.send(500);
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
                locked: "$locked"
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
                locked: "$locked"
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
