var backend = {
    host: 'mempool.space/signet',
    home_page: 'https://mempool.space/signet/',
    adr_page: 'https://mempool.space/signet/address/',
    tx_page: 'https://mempool.space/signet/tx/'
};

function backend_balance_cb(res) {
    console.log(res);
    this.balance_cb(parseFloat(res) / 1e8);
}

function backend_unspent_cb(data, adr) {
    var utxo = false;
    console.log(data);

    try { data = JSON.parse(data); } catch (e) { data = {}; }

    if (Array.isArray(data) && data.length) {
        utxo = [];
        var remaining = data.length; // Track remaining UTXOs to process

        data.forEach(function(u) {
            js.ajax('GET', 'https://mempool.space/signet/api/v1/validate-address/' + adr, '', function(response) {
                try {
                    var addressData = JSON.parse(response);
                    if (addressData.isvalid) {
                        utxo.push({
                            txid: u.txid,
                            n: u.vout,
                            amount: u.value,
                            script: addressData.scriptPubKey
                        });
                    }
                } catch (e) {
                    console.error("Error parsing address validation data:", e);
                }

                remaining--;
                if (remaining === 0) {
                    backend.unspent_cb(utxo);
                }
            });
        });
    } else {
        backend.unspent_cb(utxo);
    }
}

function backend_send_cb(data) {
    console.log(data);
    backend.send_cb(data.txid ? '' : data);
}

backend.get_balance = function(adr, cb) {
    this.balance_cb = cb;
    js.ajax('GET', 'https://mempool.space/signet/api/address/' + adr + '/utxo', '', function(data) {
        var totalBalance = 0;
        try {
            data = JSON.parse(data);
            if (Array.isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    totalBalance += data[i].value;
                }
            }
        } catch (e) {
            console.error("Error parsing UTXO data:", e);
            totalBalance = 0; // or handle error appropriately
        }
        backend_balance_cb(totalBalance.toString()); // Convert balance to string and pass to callback
    });
};

backend.get_utxo = function(adr, cb) {
    this.unspent_cb = cb;
    js.ajax('GET', 'https://mempool.space/signet/api/address/' + adr + '/utxo', '', function(data) {
        backend_unspent_cb(data, adr);
    });
};

backend.send = function(tx, cb) {
    this.send_cb = cb;
    js.ajax('POST', 'https://mempool.space/signet/api/tx', tx, backend_send_cb);
};