<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Timetable — {{ $grid['tier']['name'] }}</title>
    <style>
        @page { size: A4 landscape; margin: 8mm; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; color: #111; font-size: 7pt; }
        h1 { font-size: 12pt; text-align: center; margin: 0 0 4mm; text-transform: uppercase; }
        table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.grid th, table.grid td {
            border: 0.5pt solid #333;
            text-align: center;
            vertical-align: middle;
            padding: 1mm 0.5mm;
            word-wrap: break-word;
        }
        table.grid th { background: #f0f0f0; font-size: 6pt; line-height: 1.1; }
        td.daycol { background: #f0f0f0; font-weight: bold; white-space: nowrap; }
        td.module { font-weight: bold; font-size: 8pt; }
        td.activity { background: #dce7f3; font-weight: bold; }
        td.structural { background: #eef0f2; font-weight: bold; }
        td.empty { background: #fff; }
        table.legend { width: 60%; border-collapse: collapse; margin-top: 6mm; font-size: 8pt; }
        table.legend th, table.legend td { border: 0.5pt solid #333; padding: 1mm 2mm; text-align: left; }
        table.legend th { background: #f0f0f0; }
    </style>
</head>
<body>
    <h1>Time Table — {{ $grid['session']['name'] }} · {{ $grid['tier']['name'] }}</h1>

    <table class="grid">
        <thead>
            <tr>
                <th style="width: 9%;">DATE / TIME</th>
                @foreach($grid['periods'] as $period)
                    <th>{{ $period['time_label'] ?? '' }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach($grid['rows'] as $row)
                <tr>
                    <td class="daycol">{{ $row['date_label'] }}</td>
                    @foreach($row['cells'] as $cell)
                        <td
                            class="{{ $cell['type'] === 'module' ? 'module' : ($cell['type'] === 'empty' ? 'empty' : ($cell['structural'] ? 'structural' : 'activity')) }}"
                            @if(($cell['col_span'] ?? 1) > 1) colspan="{{ $cell['col_span'] }}" @endif
                            @if(($cell['row_span'] ?? 1) > 1) rowspan="{{ $cell['row_span'] }}" @endif
                        >
                            @if($cell['type'] === 'module')
                                {{ $cell['code'] ?: $cell['name'] }}
                            @elseif($cell['type'] === 'activity')
                                {{ $cell['label'] }}
                            @endif
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>

    @if(count($grid['legend']) > 0)
        <table class="legend">
            <thead>
                <tr>
                    <th style="width: 8%;">S/N</th>
                    <th>COURSES</th>
                    <th style="width: 16%;">CODE</th>
                    <th style="width: 28%;">LECTURER</th>
                </tr>
            </thead>
            <tbody>
                @foreach($grid['legend'] as $i => $item)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $item['name'] }}</td>
                        <td>{{ $item['code'] }}</td>
                        <td>{{ $item['teacher_name'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
