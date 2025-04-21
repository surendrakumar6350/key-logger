<?php
header("Access-Control-Allow-Origin: *");
date_default_timezone_set('Asia/Kolkata');

$date = new DateTime("now", new DateTimeZone('Asia/Kolkata'));
$d    = $date->format('d/m/Y H:i:s');

$user   = isset($_GET['user']) ? $_GET['user'] : 'Unknown User';
$values = isset($_GET['values']) ? $_GET['values'] : 'No Values';
$page   = isset($_GET['page']) ? $_GET['page'] : 'No Page';

file_put_contents("logs.txt", $d . " | " . $user . " | " . $values . " | " . $page . "\n", FILE_APPEND);

if ($_GET) {
    $ip  = $_SERVER['REMOTE_ADDR'];
    $log = $_GET['values'];

    $txt = '<tr>
                <th scope="row">' . $ip . '<br>' . $d . ' </th>
                <td width="100%" class="box3D">
                    User: ' . $user . ' <br>
                    Values: ' . $log . ' <br>
                    Page: ' . $page . '
                </td>
            </tr>';

    $myfile = fopen("logs.html", "a+") or die("Unable to open file!");
    fwrite($myfile, $txt);
    fclose($myfile);

    echo 'Hello World';
} else {
    echo 'Hello World';
}
