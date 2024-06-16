let debounceTimeout;
const worker = new Worker('worker.js', { type: 'module' });

worker.onmessage = function(e) {
    if (e.data.error) {
        console.error("Error: ", e.data.error);
    } else {
        //console.log("Response received: ", e.data);
        var response = e.data[0]["generated_text"];
        document.getElementById('output_element').innerHTML = response;
        // if (document.getElementById('option1').checked) {
        // 	document.getElementById('output_element').innerHTML = response;
        // 	document.getElementById('output_element2').innerHTML = "";
        // } else {
    	//     document.getElementById('output_element').innerHTML = "";
		// 	document.getElementById('output_element2').innerHTML = response;
        // }
    }
};

document.getElementById('input_element').addEventListener('input', function() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async function() {
        var inputText = document.getElementById('input_element').value.trim();
        var tokenCount = document.getElementById('token_count').value;
        worker.postMessage({ input: inputText, tokenCount: tokenCount });		
    }, 300); // 0.3 seconds delay
});

document.getElementById('input_element').addEventListener('keydown', function(event) {
    if (event.key === 'Tab') {
        event.preventDefault(); // Prevent the default tab behavior if necessary
        var outputText = document.getElementById('output_element').innerHTML;
        console.log("Tab key pressed. Insert text: ", outputText);
        document.getElementById('input_element').value = outputText;

    }
});