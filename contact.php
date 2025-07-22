<?php
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $to = "athianjosue@gmail.com";
    $subject = "New message from Retro Game Hub Contact Form";
    $name = strip_tags($_POST["name"]);
    $email = filter_var($_POST["email"], FILTER_SANITIZE_EMAIL);
    $message = strip_tags($_POST["message"]);
    $headers = "From: $email\r\nReply-To: $email\r\n";

    $body = "Name: $name\nEmail: $email\n\nMessage:\n$message";

    if (mail($to, $subject, $body, $headers)) {
        echo json_encode(["success" => true, "message" => "Thank you for contacting us!"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Sorry, something went wrong. Please try again."]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method not allowed."]);
exit;
?>