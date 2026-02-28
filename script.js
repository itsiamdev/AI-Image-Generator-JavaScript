document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    const generateForm = document.querySelector('.generate-form');
    const imageGallery = document.querySelector('.image-gallery');

    const API_KEY = "";
    let isImageGenerating = false;

    const updateImageGallery = (imageUrls) => {
        imageUrls.forEach((imgUrl, index) => {
            const imgCard = imageGallery.querySelectorAll('.img-card')[index];
            const imgElement = imgCard.querySelector('img');
            const downloadBtn = imgCard.querySelector('.download-btn');

            // Set the image source to the AI-generated image URL
            imgElement.src = imgUrl;

            // When the image is loaded, remove the loading class and set download attributes
            imgElement.onload = () => {
                imgCard.classList.remove('loading');
                downloadBtn.setAttribute('href', imgUrl);
                downloadBtn.setAttribute('download', `ai_image_${index + 1}.png`);
            };
        });
    };

    const generateAiImages = async (userPrompt, userImgQuantity) => {
        try {
            // Create predictions for each requested image
            const imageUrls = [];

            for (let i = 0; i < userImgQuantity; i++) {
                // Send a request to the Replicate API to generate images
                const response = await fetch("https://api.replicate.com/v1/predictions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify({
                        version: "8beff3366e16d7c10ea9ae00e2463d4424029a6d671f5d1c42c8c4b05e0c12f1",
                        input: {
                            prompt: userPrompt,
                            num_inference_steps: 30,
                            guidance_scale: 7.5
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('API Error:', errorData);
                    alert('API Error: ' + JSON.stringify(errorData));
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Poll for the result
                let prediction = data;
                while (prediction.status === "starting" || prediction.status === "processing") {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const pollResponse = await fetch(prediction.urls.get, {
                        headers: {
                            "Authorization": `Bearer ${API_KEY}`
                        }
                    });
                    prediction = await pollResponse.json();
                }

                if (prediction.status === "succeeded") {
                    imageUrls.push(prediction.output);
                } else if (prediction.status === "failed") {
                    throw new Error('Image generation failed: ' + prediction.error);
                }
            }

            updateImageGallery(imageUrls);
        } catch (error) {
            alert(error.message);
            console.error(error);
        } finally {
            isImageGenerating = false;
        }
    };

    const handleFormSubmission = async (e) => {
        e.preventDefault();
        if (isImageGenerating === true) return;
        isImageGenerating = true;

        // Get user input and image quantity values from the form
        const userPrompt = e.srcElement[0].value;
        const userImgQuantity = parseInt(e.srcElement[1].value);

        // Creating HTML markup for image cards with loading state
        const imgCardMarkup = Array.from({ length: userImgQuantity }, () => 
            `<div class="img-card loading">
                <img src="images/loader.svg" alt="image">
                <a href="#" class="download-btn">
                    <img src="images/download.svg" alt="download icon">
                </a>
            </div>`
        ).join('');
        imageGallery.innerHTML = imgCardMarkup;
        
        generateAiImages(userPrompt, userImgQuantity);
    };

    generateForm.addEventListener('submit', handleFormSubmission);
});
