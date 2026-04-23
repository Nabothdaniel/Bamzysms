<?php

namespace BamzySMS\Core;

class Router
{
    private $routes = [];

    public function add($method, $path, $controller, $action = null)
    {
        $path = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[a-zA-Z0-9_-]+)', $path);

        $handler = $action ? "{$controller}@{$action}" : $controller;

        $this->routes[] = [
            'method' => $method,
            'path' => '#^' . $path . '$#',
            'handler' => $handler
        ];
    }

    public function resolve()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        // 1. Resolve URI
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        // Remove quotes and semicolons that might come from malformed config
        $uri = str_replace(['"', ';'], '', $uri);

        // 2. Detect base path (subdirectory where the script lives)
        $scriptName = $_SERVER['SCRIPT_NAME'];
        // In the PHP built-in server without a router script, SCRIPT_NAME might equal REQUEST_URI
        // so we only extract a directory if it looks like an actual PHP file.
        if (substr($scriptName, -4) === '.php') {
            $basePath = dirname($scriptName);
        } else {
            $basePath = '';
        }

        if ($basePath === '/' || $basePath === '\\') {
            $basePath = '';
        }

        // 3. Strip base path from URI
        if ($basePath && strpos($uri, $basePath) === 0) {
            $uri = substr($uri, strlen($basePath));
        }

        // 4. Always strip leading '/api' for backend processing
        if (strpos($uri, '/api/') === 0) {
            $uri = substr($uri, 4);
        } elseif ($uri === '/api') {
            $uri = '/';
        }

        // 5. Normalization
        if (!$uri || $uri === '') {
            $uri = '/';
        } else {
            // Ensure leading slash
            if ($uri[0] !== '/') {
                $uri = '/' . $uri;
            }
            // Strip trailing slash if it's not just '/'
            if ($uri !== '/' && substr($uri, -1) === '/') {
                $uri = substr($uri, 0, -1);
            }
        }

        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match($route['path'], $uri, $matches)) {
                $handler = $route['handler'];
                list($controllerName, $methodName) = explode('@', $handler);

                $controllerClass = "BamzySMS\\Controllers\\" . $controllerName;
                if (class_exists($controllerClass)) {
                    $controller = new $controllerClass();
                    $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                    return call_user_func_array([$controller, $methodName], $params);
                }
            }
        }

        header("Content-Type: application/json");
        header("HTTP/1.1 404 Not Found");
        echo json_encode([
            'debug_marker' => 'BAMZY_ROUTER_V2',
            'error' => 'Endpoint not found',
            'method' => $method,
            'requested_uri' => $_SERVER['REQUEST_URI'],
            'matched_uri' => $uri,
            'base_path' => $basePath,
            'script_name' => $scriptName
        ]);
    }
}
