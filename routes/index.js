var express = require("express");
var router = express.Router();
let socketapi = require("../connectors/socket");
var Model = require("../connectors/mongo");

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
    latitude: api_data["uplink_message"]["decoded_payload"]["data"][0],
    longitude: api_data["uplink_message"]["decoded_payload"]["data"][1],
    speed: api_data["uplink_message"]["decoded_payload"]["data"][4],
    received_at: new Date().toISOString(),
  }).save(function (err, result) {
    if (err) throw err;

    console.log(result + err);
    if (result) {
      res.json(result);
    }
  });
});

router.get("/get_erick_data/", function (req, res) {
  Model.aggregate(
    [
      { $sort: { received_at: -1 } },
      {
        $group: {
          _id: "$erick_id",
          data: {
            $first: {
              lat: "$latitude",
              lng: "$longitude",
              speed: "$speed",
            },
          },
        },
      },
    ],
    (err, data) => {
      res.send(data);
    }
  );
});

module.exports = router;
